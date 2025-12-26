using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Interfaces;
using Pgvector.EntityFrameworkCore;
using Polly;
using Polly.Timeout;

namespace Novelytical.Application.Services;

/// <summary>
/// Novel service with PERFORMANCE-FIRST approach using Projection
/// + RESILIENCY with Polly policies
/// </summary>
public class NovelService : INovelService
{
    private readonly INovelRepository _repository;
    private readonly SmartComponents.LocalEmbeddings.LocalEmbedder _embedder;
    private readonly IMemoryCache _cache;
    private readonly ILogger<NovelService> _logger;
    private readonly ResiliencePipeline _embeddingPipeline;

    public NovelService(
        INovelRepository repository,
        SmartComponents.LocalEmbeddings.LocalEmbedder embedder,
        IMemoryCache cache,
        ILogger<NovelService> logger)
    {
        _repository = repository;
        _embedder = embedder;
        _cache = cache;
        _logger = logger;

        // 🛡️ Polly Resilience Pipeline for Embedding calls
        _embeddingPipeline = new ResiliencePipelineBuilder()
            .AddTimeout(TimeSpan.FromSeconds(5)) // Max 5 seconds for embedding
            .AddRetry(new Polly.Retry.RetryStrategyOptions
            {
                MaxRetryAttempts = 2,
                Delay = TimeSpan.FromMilliseconds(500),
                BackoffType = Polly.DelayBackoffType.Exponential,
                OnRetry = args =>
                {
                    _logger.LogWarning("Embedding retry attempt {Attempt} after {Delay}ms", 
                        args.AttemptNumber, args.RetryDelay.TotalMilliseconds);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public async Task<PagedResponse<NovelListDto>> GetNovelsAsync(
        string? searchString = null,
        string? sortOrder = null,
        int pageNumber = 1,
        int pageSize = 9)
    {
        // Cache key
        string cacheKey = $"novels_page{pageNumber}_sort{sortOrder}_search{searchString}";

        // Try cache first
        if (_cache.TryGetValue(cacheKey, out List<NovelListDto>? cachedNovels) && cachedNovels != null)
        {
            var totalCount = await _repository.GetCountAsync();
            return new PagedResponse<NovelListDto>(cachedNovels, pageNumber, pageSize, totalCount);
        }

        List<NovelListDto> novels;

        // 🔥 HYBRID SEARCH: Full-Text + Vector + RRF
        if (!string.IsNullOrEmpty(searchString))
        {
            novels = await HybridSearchWithRRF(searchString, pageNumber, pageSize);
        }
        else
        {
            // Standard sorting (no search)
            var query = _repository.GetOptimizedQuery();
            query = sortOrder switch
            {
                "rating_asc" => query.OrderBy(n => n.Rating),
                "chapters_desc" => query.OrderByDescending(n => n.ChapterCount),
                "date_desc" => query.OrderByDescending(n => n.LastUpdated),
                _ => query.OrderByDescending(n => n.Rating)
            };

            novels = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NovelListDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Author = n.Author,
                    Rating = n.Rating,
                    ChapterCount = n.ChapterCount,
                    LastUpdated = n.LastUpdated,
                    CoverUrl = n.CoverUrl,
                    Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
                })
                .ToListAsync();
        }

        // Cache for 5 minutes
        _cache.Set(cacheKey, novels, TimeSpan.FromMinutes(5));

        int totalRecords = await _repository.GetCountAsync();
        return new PagedResponse<NovelListDto>(novels, pageNumber, pageSize, totalRecords);
    }

    /// <summary>
    /// Hybrid Search: Full-Text + Vector Search combined with RRF Algorithm
    /// </summary>
    private async Task<List<NovelListDto>> HybridSearchWithRRF(
        string searchString, 
        int pageNumber, 
        int pageSize)
    {
        // 1️⃣ & 2️⃣ PARALLEL EXECUTION: Full-Text & Vector Search
        var tsQuery = string.Join(" & ", searchString.Split(' ', StringSplitOptions.RemoveEmptyEntries));

        // Task A: Full-Text Search -> Returns List<Novel>
        var fullTextTask = _repository.GetOptimizedQuery()
            .Where(n => n.SearchVector!.Matches(EF.Functions.ToTsQuery("simple", tsQuery)))
            .Select(n => new { Novel = n, Rank = n.SearchVector!.Rank(EF.Functions.ToTsQuery("simple", tsQuery)) })
            .OrderByDescending(x => x.Rank)
            .Select(x => x.Novel) // Project to Novel only
            .Take(pageSize * 3)
            .ToListAsync();

        // Task B: Vector Search -> Returns List<Novel>
        var vectorTask = Task.Run(async () =>
        {
            try
            {
                // B1: Generate Embedding
                var searchVector = await _embeddingPipeline.ExecuteAsync(async ct =>
                {
                    return await Task.Run(() => _embedder.Embed(searchString), ct);
                });
                var searchVectorPg = new Pgvector.Vector(searchVector.Values.ToArray());

                // B2: Vector Query
                return await _repository.GetOptimizedQuery()
                    .Select(n => new { 
                        Novel = n, 
                        Distance = n.DescriptionEmbedding!.CosineDistance(searchVectorPg) 
                    })
                    .OrderBy(x => x.Distance)
                    .Select(x => x.Novel) // Project to Novel only
                    .Take(pageSize * 3)
                    .ToListAsync();
            }
            catch (TimeoutRejectedException)
            {
                _logger.LogWarning("Embedding timed out for searchString: {SearchString}", searchString);
                return new List<Novel>(); // Type-safe return
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Embedding failed for searchString: {SearchString}", searchString);
                return new List<Novel>(); // Return empty list on failure
            }
        });

        // ⏳ Wait for both to complete
        await Task.WhenAll(fullTextTask, vectorTask);

        var fullTextResults = fullTextTask.Result;
        var vectorResults = vectorTask.Result;

        // Fallback check: If vector search failed (empty) and full-text has results, use full-text only
        if ((vectorResults == null || vectorResults.Count == 0) && fullTextResults.Count > 0)
        {
             return fullTextResults
                    Title = x.Novel.Title,
                    Author = x.Novel.Author,
                    Rating = x.Novel.Rating,
                    ChapterCount = x.Novel.ChapterCount,
                    LastUpdated = x.Novel.LastUpdated,
                    CoverUrl = x.Novel.CoverUrl,
                    Tags = x.Novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
                })
                .ToList();
        }
        
        var vectorResults = await _repository.GetOptimizedQuery()
            .Select(n => new { 
                Novel = n, 
                Distance = n.DescriptionEmbedding!.CosineDistance(searchVectorPg) 
            })
            .OrderBy(x => x.Distance)
            .Take(pageSize * 3)
            .ToListAsync();

        // 3️⃣ RRF FUSION (Reciprocal Rank Fusion - k=60)
        var fusedNovels = ApplyRRF(
            fullTextResults.Select((x, i) => (x.Novel, i + 1)).ToList(),
            vectorResults.Select((x, i) => (x.Novel, i + 1)).ToList(),
            k: 60
        );

        // 4️⃣ Pagination + Projection to DTO
        var pagedNovels = fusedNovels
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NovelListDto
            {
                Id = n.Id,
                Title = n.Title,
                Author = n.Author,
                Rating = n.Rating,
                ChapterCount = n.ChapterCount,
                LastUpdated = n.LastUpdated,
                CoverUrl = n.CoverUrl,
                Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
            })
            .ToList();

        return pagedNovels;
    }

    /// <summary>
    /// Reciprocal Rank Fusion (RRF) Algorithm
    /// Combines rankings from multiple sources with formula: RRF_score = Σ(1 / (k + rank))
    /// </summary>
    private List<Novel> ApplyRRF(
        List<(Novel Novel, int Rank)> fullTextList,
        List<(Novel Novel, int Rank)> vectorList,
        int k = 60)
    {
        var rrfScores = new Dictionary<int, double>();
        
        // Add Full-Text scores
        foreach (var (novel, rank) in fullTextList)
        {
            rrfScores[novel.Id] = rrfScores.GetValueOrDefault(novel.Id) + 1.0 / (k + rank);
        }
        
        // Add Vector scores
        foreach (var (novel, rank) in vectorList)
        {
            rrfScores[novel.Id] = rrfScores.GetValueOrDefault(novel.Id) + 1.0 / (k + rank);
        }
        
        // Combine all novels
        var allNovels = fullTextList.Select(x => x.Novel)
            .Concat(vectorList.Select(x => x.Novel))
            .DistinctBy(n => n.Id)
            .ToDictionary(n => n.Id);
        
        // Sort by RRF score (highest first)
        return rrfScores
            .OrderByDescending(x => x.Value)
            .Where(x => allNovels.ContainsKey(x.Key))
            .Select(x => allNovels[x.Key])
            .ToList();
    }

    public async Task<Response<NovelDetailDto>> GetNovelByIdAsync(int id)
    {
        var novel = await _repository.GetByIdAsync(id);

        if (novel == null)
            return new Response<NovelDetailDto>("Novel not found");

        // Manual mapping (could use AutoMapper but Projection is faster)
        var dto = new NovelDetailDto
        {
            Id = novel.Id,
            Title = novel.Title,
            Author = novel.Author,
            Description = novel.Description,
            Rating = novel.Rating,
            ChapterCount = novel.ChapterCount,
            LastUpdated = novel.LastUpdated,
            CoverUrl = novel.CoverUrl,
            SourceUrl = novel.SourceUrl,
            Tags = novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).ToList()
        };

        return new Response<NovelDetailDto>(dto);
    }
}
