using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Interfaces;
using Pgvector.EntityFrameworkCore;
using Polly;
using Polly.Timeout;

namespace Novelytical.Application.Features.Novels.Queries.GetNovels;

public class GetNovelsQueryHandler : IRequestHandler<GetNovelsQuery, PagedResponse<NovelListDto>>
{
    private readonly INovelRepository _repository;
    private readonly IEmbedder _embedder;
    private readonly IMemoryCache _cache;
    private readonly ILogger<GetNovelsQueryHandler> _logger;
    private readonly ResiliencePipeline _embeddingPipeline;
    private readonly IServiceScopeFactory _scopeFactory;

    public GetNovelsQueryHandler(
        INovelRepository repository,
        IEmbedder embedder,
        IMemoryCache cache,
        ILogger<GetNovelsQueryHandler> logger,
        IServiceScopeFactory scopeFactory)
    {
        _repository = repository;
        _embedder = embedder;
        _cache = cache;
        _logger = logger;
        _scopeFactory = scopeFactory;

        // 🛡️ Polly Resilience Pipeline for Embedding calls
        _embeddingPipeline = new ResiliencePipelineBuilder()
            .AddTimeout(TimeSpan.FromSeconds(5))
            .AddRetry(new Polly.Retry.RetryStrategyOptions
            {
                MaxRetryAttempts = 2,
                Delay = TimeSpan.FromMilliseconds(500),
                BackoffType = DelayBackoffType.Exponential,
                OnRetry = args =>
                {
                    _logger.LogWarning("Embedding retry attempt {Attempt} after {Delay}ms",
                        args.AttemptNumber, args.RetryDelay.TotalMilliseconds);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public async Task<PagedResponse<NovelListDto>> Handle(GetNovelsQuery request, CancellationToken cancellationToken)
    {
        // Cache key
        string tagsKey = request.Tags != null && request.Tags.Any() ? string.Join("_", request.Tags.OrderBy(t => t)) : "none";
        string cacheKey = $"novels_v6_p{request.PageNumber}_ps{request.PageSize}_s{request.SortOrder}_q{request.SearchString}_t{tagsKey}_c{request.MinChapters}-{request.MaxChapters}_r{request.MinRating}-{request.MaxRating}";

        // Try cache first (skip if filters active)
        bool hasFilters = (request.Tags != null && request.Tags.Any()) || request.MinChapters.HasValue || request.MaxChapters.HasValue || request.MinRating.HasValue || request.MaxRating.HasValue;

        if (!hasFilters &&
            _cache.TryGetValue(cacheKey, out List<NovelListDto>? cachedNovels) &&
            cachedNovels != null)
        {
            var totalCount = await _repository.GetCountAsync();
            return new PagedResponse<NovelListDto>(cachedNovels, request.PageNumber, request.PageSize, totalCount);
        }

        List<NovelListDto> novels;
        int totalRecords;

        // Standard sorting and filtering
        var query = _repository.GetOptimizedQuery();

        // 0. Search Filtering (Simple Title Search) requested by user
        if (!string.IsNullOrEmpty(request.SearchString))
        {
            query = query.Where(n => EF.Functions.ILike(n.Title, $"%{request.SearchString}%"));
        }

        // 1. Tag filtering
        if (request.Tags != null && request.Tags.Any())
        {
            foreach (var tag in request.Tags)
            {
                if (tag.StartsWith("-"))
                {
                    var cleanTag = tag.Substring(1).Trim().ToLower();
                    query = query.Where(n => !n.NovelTags.Any(nt => nt.Tag.Name.ToLower() == cleanTag));
                }
                else
                {
                    var lowerTag = tag.Trim().ToLower();
                    query = query.Where(n => n.NovelTags.Any(nt => nt.Tag.Name.ToLower() == lowerTag));
                }
            }
        }

        // 2. Chapter Count filtering
        if (request.MinChapters.HasValue) query = query.Where(n => n.ChapterCount >= request.MinChapters.Value);
        if (request.MaxChapters.HasValue) query = query.Where(n => n.ChapterCount <= request.MaxChapters.Value);

        // 3. Rating filtering
        if (request.MinRating.HasValue) query = query.Where(n => n.Rating >= request.MinRating.Value);
        if (request.MaxRating.HasValue) query = query.Where(n => n.Rating <= request.MaxRating.Value);

        // Count AFTER filtering
        totalRecords = await query.CountAsync(cancellationToken);

        query = request.SortOrder switch
        {
            "rating_asc" => query.OrderBy(n => n.Rating).ThenBy(n => n.Id),
            "rating_desc" => query.OrderByDescending(n => n.Rating).ThenBy(n => n.Id),
            "views_desc" => query.OrderByDescending(n => n.ViewCount).ThenBy(n => n.Id),
            "chapters_desc" => query.OrderByDescending(n => n.ChapterCount).ThenBy(n => n.Id),
            "date_desc" => query.OrderByDescending(n => n.LastUpdated).ThenBy(n => n.Id),
            _ => query.OrderByDescending(n => n.Rating).ThenBy(n => n.Id)
        };

        var pagedEntities = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        novels = pagedEntities.Select(n => new NovelListDto
        {
            Id = n.Id,
            Slug = n.Slug, // Map Slug
            Title = n.Title,
            Author = n.Author ?? string.Empty,
            Rating = n.Rating,
            ScrapedRating = n.ScrapedRating, // New
            ViewCount = n.ViewCount,         // New
            Status = n.Status,               // New
            ChapterCount = n.ChapterCount,
            LastUpdated = n.LastUpdated,
            CoverUrl = n.CoverUrl,
            Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
        }).ToList();

        // Cache for 5 minutes if successful and not empty (optional, but good)
        // Original logic cached it.
        _cache.Set(cacheKey, novels, TimeSpan.FromMinutes(5));

        return new PagedResponse<NovelListDto>(novels, request.PageNumber, request.PageSize, totalRecords);
    }

    private async Task<(List<NovelListDto> Novels, int TotalCount)> HybridSearchWithRRF(GetNovelsQuery request)
    {
        // 1️⃣ & 2️⃣ PARALLEL EXECUTION: Full-Text & Vector Search
        var tsQuery = string.Join(" & ", request.SearchString!.Split(' ', StringSplitOptions.RemoveEmptyEntries));

        // Task A: Full-Text Search -> Returns List<Novel>
        var fullTextQuery = _repository.GetOptimizedQuery();

        // Apply Filters to Full Text Query
        if (request.MinChapters.HasValue) fullTextQuery = fullTextQuery.Where(n => n.ChapterCount >= request.MinChapters.Value);
        if (request.MaxChapters.HasValue) fullTextQuery = fullTextQuery.Where(n => n.ChapterCount <= request.MaxChapters.Value);
        if (request.MinRating.HasValue) fullTextQuery = fullTextQuery.Where(n => n.Rating >= request.MinRating.Value);
        if (request.MaxRating.HasValue) fullTextQuery = fullTextQuery.Where(n => n.Rating <= request.MaxRating.Value);

        if (request.Tags != null && request.Tags.Any())
        {
            foreach (var tag in request.Tags)
            {
                if (tag.StartsWith("-"))
                {
                    var cleanTag = tag.Substring(1);
                    fullTextQuery = fullTextQuery.Where(n => !n.NovelTags.Any(nt => nt.Tag.Name.ToLower() == cleanTag.ToLower()));
                }
                else
                {
                    fullTextQuery = fullTextQuery.Where(n => n.NovelTags.Any(nt => nt.Tag.Name.ToLower() == tag.ToLower()));
                }
            }
        }

        var fullTextTask = fullTextQuery
            .Where(n => n.SearchVector!.Matches(EF.Functions.ToTsQuery("simple", tsQuery)))
            .Select(n => new { Novel = n, Rank = n.SearchVector!.Rank(EF.Functions.ToTsQuery("simple", tsQuery)) })
            .OrderByDescending(x => x.Rank)
            .Select(x => x.Novel)
            .Take(24)
            .ToListAsync();

        // Task C: Simple Substring Search (ILike) -> Returns List<Novel>
        // Catches exact substring matches that FTS might miss due to stemming/dictionary issues
        var simpleSearchTask = fullTextQuery
             .Where(n => EF.Functions.ILike(n.Title, $"%{request.SearchString}%"))
             .OrderBy(n => n.Title.Length) // Prefer exact/shorter matches
             .Take(10)
             .ToListAsync();

        // Task B: Vector Search -> Returns List<Novel>
        var vectorTask = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var scopedRepo = scope.ServiceProvider.GetRequiredService<INovelRepository>();

                // B1: Generate Embedding
                var searchVector = await _embeddingPipeline.ExecuteAsync(async ct =>
                {
                    return await _embedder.EmbedAsync(request.SearchString);
                });
                var searchVectorPg = new Pgvector.Vector(searchVector);

                // B2: Vector Query
                var vectorQuery = scopedRepo.GetOptimizedQuery();

                if (request.Tags != null && request.Tags.Any())
                {
                    foreach (var tag in request.Tags)
                    {
                        if (tag.StartsWith("-"))
                        {
                            var cleanTag = tag.Substring(1);
                            vectorQuery = vectorQuery.Where(n => !n.NovelTags.Any(nt => nt.Tag.Name.ToLower() == cleanTag.ToLower()));
                        }
                        else
                        {
                            vectorQuery = vectorQuery.Where(n => n.NovelTags.Any(nt => nt.Tag.Name.ToLower() == tag.ToLower()));
                        }
                    }
                }

                if (request.MinChapters.HasValue) vectorQuery = vectorQuery.Where(n => n.ChapterCount >= request.MinChapters.Value);
                if (request.MaxChapters.HasValue) vectorQuery = vectorQuery.Where(n => n.ChapterCount <= request.MaxChapters.Value);
                if (request.MinRating.HasValue) vectorQuery = vectorQuery.Where(n => n.Rating >= request.MinRating.Value);
                if (request.MaxRating.HasValue) vectorQuery = vectorQuery.Where(n => n.Rating <= request.MaxRating.Value);

                return await vectorQuery
                    .Select(n => new {
                        Novel = n,
                        Distance = n.DescriptionEmbedding!.CosineDistance(searchVectorPg)
                    })
                    .Where(x => x.Distance < 0.35)
                    .OrderBy(x => x.Distance)
                    .Select(x => x.Novel)
                    .Take(20)
                    .ToListAsync();
            }
            catch (TimeoutRejectedException)
            {
                _logger.LogWarning("Embedding timed out for searchString: {SearchString}", request.SearchString);
                return new List<Novel>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Embedding failed for searchString: {SearchString}", request.SearchString);
                return new List<Novel>();
            }
        });

        var results = await Task.WhenAll(fullTextTask, vectorTask, simpleSearchTask);
        var fullTextResults = results[0] ?? new List<Novel>();
        var vectorResults = results[1] ?? new List<Novel>();
        var simpleResults = results[2] ?? new List<Novel>();

        // Merge Simple Search results into Full Text results (High Priority)
        // We prepend them so they get better Rank in RRF (lower index = better score)
        var mergedTextResults = simpleResults
            .Concat(fullTextResults)
            .DistinctBy(n => n.Id)
            .ToList();

        if ((vectorResults == null || vectorResults.Count == 0) && fullTextResults.Count > 0)
        {
            var fallbackResults = fullTextResults
               .Select(n => new NovelListDto
               {
                   Id = n.Id,
                   Slug = n.Slug, // Map Slug
                   Title = n.Title,
                   Author = n.Author ?? string.Empty,
                   Rating = n.Rating,
                   ChapterCount = n.ChapterCount,
                   LastUpdated = n.LastUpdated,
                   CoverUrl = n.CoverUrl,
                   Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
               })
               .ToList();

            return (fallbackResults.Take(request.PageSize).ToList(), fallbackResults.Count);
        }

        var fusedNovels = ApplyRRF(
            mergedTextResults.Select((x, i) => (x, i + 1)).ToList(),
            vectorResults.Select((x, i) => (x, i + 1)).ToList(),
            k: 60
        );

        IEnumerable<Novel> processedList = fusedNovels;

        if (!string.IsNullOrEmpty(request.SortOrder))
        {
            processedList = request.SortOrder switch
            {
                "rating_asc" => fusedNovels.OrderByDescending(n => n.Rating),
                "rating_desc" => fusedNovels.OrderBy(n => n.Rating),
                "chapters_desc" => fusedNovels.OrderByDescending(n => n.ChapterCount),
                "date_desc" => fusedNovels.OrderByDescending(n => n.LastUpdated),
                _ => fusedNovels.OrderByDescending(n => n.Rating)
            };
        }

        var pagedNovels = (processedList ?? Enumerable.Empty<Novel>())
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => new NovelListDto
            {
                Id = n.Id,
                Slug = n.Slug, // Map Slug
                Title = n.Title,
                Author = n.Author ?? string.Empty,
                Rating = n.Rating,
                ChapterCount = n.ChapterCount,
                LastUpdated = n.LastUpdated,
                CoverUrl = n.CoverUrl,
                Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
            })
            .ToList();

        return (pagedNovels, processedList?.Count() ?? 0);
    }

    private List<Novel> ApplyRRF(
        List<(Novel Novel, int Rank)> fullTextList,
        List<(Novel Novel, int Rank)> vectorList,
        int k = 60)
    {
        var rrfScores = new Dictionary<int, double>();

        foreach (var (novel, rank) in fullTextList)
        {
            rrfScores[novel.Id] = rrfScores.GetValueOrDefault(novel.Id) + 1.0 / (k + rank);
        }

        foreach (var (novel, rank) in vectorList)
        {
            rrfScores[novel.Id] = rrfScores.GetValueOrDefault(novel.Id) + 1.0 / (k + rank);
        }

        var allNovels = fullTextList.Select(x => x.Novel)
            .Concat(vectorList.Select(x => x.Novel))
            .DistinctBy(n => n.Id)
            .ToDictionary(n => n.Id);

        return rrfScores
            .OrderByDescending(x => x.Value)
            .Where(x => allNovels.ContainsKey(x.Key))
            .Select(x => allNovels[x.Key])
            .ToList();
    }
}
