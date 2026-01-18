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
using GTranslate.Translators;

namespace Novelytical.Application.Features.Novels.Queries.GetNovels;

public class GetNovelsQueryHandler : IRequestHandler<GetNovelsQuery, PagedResponse<NovelListDto>>
{
    private readonly INovelRepository _repository;
    private readonly IEmbedder _embedder;
    private readonly IMemoryCache _cache;
    private readonly ILogger<GetNovelsQueryHandler> _logger;
    private readonly ResiliencePipeline _embeddingPipeline;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AggregateTranslator _translator = new();

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

        // Cache check re-enabled per user request (Performance optimization)
        
        try
        {
            // Cache check re-enabled per user request (Performance optimization)
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

            // 0. Hybrid Search (Vector + FullText) if search is active
            if (!string.IsNullOrWhiteSpace(request.SearchString))
            {
                try 
                {
                    var (searchResults, searchCount) = await HybridSearchWithRRF(request);
                    return new PagedResponse<NovelListDto>(searchResults, request.PageNumber, request.PageSize, searchCount);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Hybrid Search failed for query: {Query}. Falling back to standard search.", request.SearchString);
                    // Fallback to standard ILike search execution below
                    query = query.Where(n => EF.Functions.ILike(n.Title, $"%{request.SearchString}%"));
                }
            }

            // ... (rest of filtering) ...
            
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
                "rating_asc" => query
                    .OrderBy(n => ((double)(n.ScrapedRating ?? 0) * (int)(n.ViewCount / 10000.0) + (double)n.Rating * n.ReviewCount) / ((int)(n.ViewCount / 10000.0) + n.ReviewCount + 0.00001))
                    .ThenBy(n => n.Id),
                "rating_desc" => query
                    .OrderByDescending(n => ((double)(n.ScrapedRating ?? 0) * (int)(n.ViewCount / 10000.0) + (double)n.Rating * n.ReviewCount) / ((int)(n.ViewCount / 10000.0) + n.ReviewCount + 0.00001))
                    .ThenByDescending(n => (int)(n.ViewCount / 10000.0) + n.SiteViewCount + (n.CommentCount * 20) + (n.ReviewCount * 50)) // Tie-breaker: Global Rank
                    .ThenBy(n => n.Id),
                "views_desc" => query.OrderByDescending(n => n.ViewCount + n.SiteViewCount).ThenBy(n => n.Id),
                "chapters_desc" => query.OrderByDescending(n => n.ChapterCount).ThenBy(n => n.Id),
                "date_desc" => query.OrderByDescending(n => n.LastUpdated).ThenBy(n => n.Id),
                "rank_desc" => query
                    .OrderByDescending(n => (int)(n.ViewCount / 10000.0) + n.SiteViewCount + (n.CommentCount * 20) + (n.ReviewCount * 50))
                    .ThenByDescending(n => n.ScrapedRating ?? n.Rating)
                    .ThenBy(n => n.Id),
                _ => query.OrderByDescending(n => n.Rating).ThenBy(n => n.Id)
            };

            var pagedEntities = await query
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync(cancellationToken);

            novels = pagedEntities.Select(n => new NovelListDto
            {
                Id = n.Id,
                Slug = n.Slug,
                Title = n.Title,
                Author = n.Author ?? string.Empty,
                Rating = n.Rating,
                ScrapedRating = n.ScrapedRating,
                ViewCount = n.ViewCount,
                Status = n.Status,
                ChapterCount = n.ChapterCount,
                LastUpdated = n.LastUpdated,
                CoverUrl = n.CoverUrl,
                Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
            }).ToList();

            // Calculate global rank positions (omitted for brevity in replacement constraint, assuming identical logic)
            // ... Actually I must include it or I break it. I will keep it.
            
            // Calculate global rank positions
            var allNovelRanks = await _repository.GetOptimizedQuery()
                .Select(n => new { 
                    n.Id, 
                    RankScore = (int)(n.ViewCount / 10000.0) + n.SiteViewCount + (n.CommentCount * 20) + (n.ReviewCount * 50),
                    Rating = n.ScrapedRating ?? n.Rating
                })
                .OrderByDescending(x => x.RankScore)
                .ThenByDescending(x => x.Rating)
                .ThenBy(x => x.Id)
                .ToListAsync(cancellationToken);

            var rankPositions = allNovelRanks
                .Select((x, index) => new { x.Id, Position = index + 1 })
                .ToDictionary(x => x.Id, x => x.Position);

            foreach (var novel in novels)
            {
                if (rankPositions.TryGetValue(novel.Id, out var position))
                {
                    novel.RankPosition = position;
                }
            }

            _cache.Set(cacheKey, novels, TimeSpan.FromMinutes(5));

            return new PagedResponse<NovelListDto>(novels, request.PageNumber, request.PageSize, totalRecords);
        }
        catch (Exception ex)
        {
             _logger.LogError(ex, "Critical Error in GetNovelsQueryHandler");
             throw;
        }
    }

    private async Task<(List<NovelListDto> Novels, int TotalCount)> HybridSearchWithRRF(GetNovelsQuery request)
    {
        // 1️⃣ & 2️⃣ PARALLEL EXECUTION: Full-Text & Vector Search
        var expandedQuery = await ExpandQueryAsync(request.SearchString!);
        // User Feedback: Dataset is English, so always search with English term ONLY.
        // This ensures "Köle" -> "Slave" gives exact same results/ranking as "Slave".
        var tsQuery = string.Join(" | ", expandedQuery.Split(' ', StringSplitOptions.RemoveEmptyEntries));

        // Task B: Vector Search -> Returns List<Novel> (Starts immediately in background)
        var vectorTask = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var scopedRepo = scope.ServiceProvider.GetRequiredService<INovelRepository>();

                // B1: Generate Embedding (Use Expanded Query)
                var searchVector = await _embeddingPipeline.ExecuteAsync(async ct =>
                {
                    return await _embedder.EmbedAsync(expandedQuery);
                });
                var searchVectorPg = new Pgvector.Vector(searchVector);

                // B2: Vector Query
                var vectorQuery = scopedRepo.GetOptimizedQuery();

                if (request.MinChapters.HasValue) vectorQuery = vectorQuery.Where(n => n.ChapterCount >= request.MinChapters.Value);
                if (request.MaxChapters.HasValue) vectorQuery = vectorQuery.Where(n => n.ChapterCount <= request.MaxChapters.Value);
                if (request.MinRating.HasValue) vectorQuery = vectorQuery.Where(n => n.Rating >= request.MinRating.Value);
                if (request.MaxRating.HasValue) vectorQuery = vectorQuery.Where(n => n.Rating <= request.MaxRating.Value);

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
            catch (Exception ex)
            {
                _logger.LogWarning("Vector Search failed: {Message}", ex.Message);
                return new List<Novel>();
            }
        });

        // Task A: Full-Text Search -> Returns List<Novel> (Run SEQUENTIALLY on Main Context)
        var fullTextQuery = _repository.GetOptimizedQuery();
        var fullTextResults = await fullTextQuery
            .Where(n => n.SearchVector!.Matches(EF.Functions.ToTsQuery("simple", tsQuery)))
            .Select(n => new { Novel = n, Rank = n.SearchVector!.Rank(EF.Functions.ToTsQuery("simple", tsQuery)) })
            .OrderByDescending(x => x.Rank)
            .Select(x => x.Novel)
            .Take(24)
            .ToListAsync();

        // Task C: Simple Substring Search (Run SEQUENTIALLY on Main Context)
        var simpleResults = await fullTextQuery
             .Where(n => EF.Functions.ILike(n.Title, $"%{expandedQuery}%"))
             .OrderBy(n => n.Title.Length) 
             .Take(10)
             .ToListAsync();

        // Task D: Semantic Tag Boosting (Run in Background)
        // Find tags that mean the same as the query (e.g. "Ant" -> "Non-Human")
        var tagTask = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<INovelRepository>();
                var scopedEmbedder = scope.ServiceProvider.GetRequiredService<IEmbedder>(); // Scoped Instance

                // 1. Ensure Tag Embeddings are Cached
                if (!_cache.TryGetValue("AllTagVectors", out Dictionary<string, float[]>? tagEmbeddings))
                {
                    var allTags = await repo.GetAllTagsAsync();

                    tagEmbeddings = new Dictionary<string, float[]>();
                    foreach (var tag in allTags)
                    {
                        // Embed tag name using scoped embedder
                        var vec = await _embeddingPipeline.ExecuteAsync(async ct => await scopedEmbedder.EmbedAsync(tag.Name));
                        tagEmbeddings[tag.Name] = vec;
                    }
                    
                    // Cache for 1 hour
                    _cache.Set("AllTagVectors", tagEmbeddings, TimeSpan.FromHours(1));
                    _logger.LogInformation("Cached {Count} tag embeddings.", tagEmbeddings.Count);
                }

                // 2. Embed Query to compare with Tags
                var queryVector = await _embeddingPipeline.ExecuteAsync(async ct => await scopedEmbedder.EmbedAsync(expandedQuery));
                
                // --- DOMAIN KNOWLEDGE INJECTION ---
                // Help the AI with specific domain knowledge it might miss
                var domainKnowledge = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase)
                {
                    { "ant", new() { "Insects", "Non-humanoid Protagonist", "Reincarnated as a Monster", "Monster" } },
                    { "spider", new() { "Insects", "Non-humanoid Protagonist", "Reincarnated as a Monster" } },
                    { "slime", new() { "Non-humanoid Protagonist", "Reincarnated as a Monster", "Slime" } },
                    { "goblin", new() { "Non-humanoid Protagonist", "Reincarnated as a Monster", "Green Skin" } },
                    { "dragon", new() { "Dragons", "Non-humanoid Protagonist" } }
                };

                var relevantTags = new List<string>();

                foreach (var key in domainKnowledge.Keys)
                {
                    if (expandedQuery.Contains(key, StringComparison.OrdinalIgnoreCase))
                    {
                        var boostedTags = domainKnowledge[key];
                        relevantTags.AddRange(boostedTags);
                    }
                }
                // ----------------------------------

                // 3. Find Matching Tags (Distance < 0.35)
                if (tagEmbeddings != null)
                {
                    foreach (var kvp in tagEmbeddings)
                    {
                        var distance = ComputeCosineDistance(queryVector, kvp.Value);
                        
                        // DEBUG LOG: See what tags are close
                        if (distance < 0.45) // Threshold
                        {
                            if (!relevantTags.Contains(kvp.Key))
                                relevantTags.Add(kvp.Key);
                        }
                    }
                }

                if (!relevantTags.Any()) 
                {
                    _logger.LogInformation("No Semantic Tags found for query: {Query}", expandedQuery);
                    return new List<Novel>();
                }
                
                // 4. Fetch Novels with these tags
                var results = await repo.GetOptimizedQuery()
                    .Where(n => n.NovelTags.Any(nt => relevantTags.Contains(nt.Tag.Name)))
                    .OrderByDescending(n => n.Rating) // Boost high rated ones
                    .Take(15) // Limit injection
                    .ToListAsync();
                    
                _logger.LogInformation("Semantic Tag Boost found {Count} novels.", results.Count);
                return results;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Semantic Tag Boosting failed.");
                return new List<Novel>();
            }
        });

        // 3️⃣ EXECUTE / AWAIT RESULTS
        // Vector and Tag tasks are already running in background (scoped).
        // Main context queries (FullText, Simple) are already awaited above sequentially.
        
        var vectorResults = await vectorTask;
        var tagResults = await tagTask;

        // Merge Simple Search results into Full Text results (High Priority)
        // Order: Simple > TagBoost > FullText > Vector
        var mergedTextResults = simpleResults
            .Concat(tagResults) // Tag Boosts are high relevance recommendations
            .Concat(fullTextResults)
            .DistinctBy(n => n.Id)
            .ToList();
            
        // Fallback or Merge logic...
        if ((vectorResults == null || vectorResults.Count == 0) && fullTextResults.Count > 0)
        {
             // Fallback logic
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
                ScrapedRating = n.ScrapedRating, // Added
                ViewCount = n.ViewCount,         // Added
                Status = n.Status,               // Added
                ChapterCount = n.ChapterCount,
                LastUpdated = n.LastUpdated,
                CoverUrl = n.CoverUrl,
                Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
            })
            .ToList();

        // Calculate global rank positions
        var allNovelRanks = await _repository.GetOptimizedQuery()
            .Select(n => new { 
                n.Id, 
                RankScore = (int)(n.ViewCount / 10000.0) + n.SiteViewCount + (n.CommentCount * 20) + (n.ReviewCount * 50),
                Rating = n.ScrapedRating ?? n.Rating
            })
            .OrderByDescending(x => x.RankScore)
            .ThenByDescending(x => x.Rating)
            .ThenBy(x => x.Id)
            .ToListAsync();

        var rankPositions = allNovelRanks
            .Select((x, index) => new { x.Id, Position = index + 1 })
            .ToDictionary(x => x.Id, x => x.Position);

        foreach (var novel in pagedNovels)
        {
            if (rankPositions.TryGetValue(novel.Id, out var position))
            {
                novel.RankPosition = position;
            }
        }

        return (pagedNovels, processedList?.Count() ?? 0);
    }

    private static double ComputeCosineDistance(float[] v1, float[] v2)
    {
        if (v1.Length != v2.Length) return 1.0;

        double dot = 0.0;
        double mag1 = 0.0;
        double mag2 = 0.0;

        for (int i = 0; i < v1.Length; i++)
        {
            dot += v1[i] * v2[i];
            mag1 += v1[i] * v1[i];
            mag2 += v2[i] * v2[i];
        }
        
        if (mag1 == 0 || mag2 == 0) return 1.0;

        double similarity = dot / (Math.Sqrt(mag1) * Math.Sqrt(mag2));
        return 1.0 - similarity; // Distance
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

    private async Task<string> ExpandQueryAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return query;

        try
        {
            // Translate Turkish to English
            // Using AggregateTranslator to try Google, Bing, Yandex automatically
            var translationResult = await _translator.TranslateAsync(query, "en");
            
            if (translationResult != null && !string.Equals(translationResult.Translation, query, StringComparison.OrdinalIgnoreCase))
            {
                // User Feedback: Dataset is English, so always search with English term ONLY.
                // This ensures "Köle" -> "Slave" gives exact same results/ranking as "Slave".
                return translationResult.Translation;
            }
        }
        catch (Exception ex)
        {
            // Fail safe: return original query if translation fails (internet issues, etc.)
            _logger.LogWarning(ex, "Translation failed for query: {Query}", query);
        }

        return query;
    }
}
