using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Interfaces;
using Pgvector.EntityFrameworkCore;

namespace Novelytical.Application.Features.Novels.Queries.GetSimilarNovels;

public class GetSimilarNovelsQueryHandler : IRequestHandler<GetSimilarNovelsQuery, Response<List<NovelListDto>>>
{
    private readonly INovelRepository _repository;
    private readonly ILogger<GetSimilarNovelsQueryHandler> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public GetSimilarNovelsQueryHandler(
        INovelRepository repository,
        ILogger<GetSimilarNovelsQueryHandler> logger,
        IServiceScopeFactory scopeFactory)
    {
        _repository = repository;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<Response<List<NovelListDto>>> Handle(GetSimilarNovelsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Get Current Novel
            var currentNovel = await _repository.GetByIdAsync(request.NovelId);

            if (currentNovel == null)
                return new Response<List<NovelListDto>>("Roman bulunamadı");

            List<NovelListDto> similarNovels = new();

            // 2. Vector Search (Primary Strategy)
            if (currentNovel.DescriptionEmbedding != null)
            {
                var currentVector = currentNovel.DescriptionEmbedding!;

                // Use a new scope for vector query to ensure thread safety/isolation if needed
                using var scope = _scopeFactory.CreateScope();
                var scopedRepo = scope.ServiceProvider.GetRequiredService<INovelRepository>();

                similarNovels = await scopedRepo.GetOptimizedQuery()
                    .Where(n => n.Id != request.NovelId)
                    .Select(n => new
                    {
                        Novel = n,
                        Distance = n.DescriptionEmbedding!.CosineDistance(currentVector)
                    })
                    .Where(x => x.Distance < 0.35) // 🎯 Relevance Threshold
                    .OrderBy(x => x.Distance)
                    .Take(request.Limit)
                    .Select(x => new NovelListDto
                    {
                        Id = x.Novel.Id,
                        Title = x.Novel.Title,
                        Author = x.Novel.Author ?? string.Empty,
                        Rating = x.Novel.Rating,
                        ScrapedRating = x.Novel.ScrapedRating,
                        ViewCount = x.Novel.ViewCount,
                        Status = x.Novel.Status,
                        ChapterCount = x.Novel.ChapterCount,
                        LastUpdated = x.Novel.LastUpdated,
                        CoverUrl = x.Novel.CoverUrl,
                        Tags = x.Novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
                    })
                    .ToListAsync(cancellationToken);
            }

            // 3. Fallback / Fill Strategy: Tag-Based (If vector search didn't return enough)
            if (similarNovels.Count < request.Limit)
            {
                var remainingCount = request.Limit - similarNovels.Count;
                var currentTags = currentNovel.NovelTags.Select(nt => nt.TagId).ToList();
                var existingIds = similarNovels.Select(n => n.Id).Append(request.NovelId).ToList();

                var tagBasedNovels = await _repository.GetOptimizedQuery()
                    .Where(n => !existingIds.Contains(n.Id)) // Exclude already found
                    .Where(n => n.NovelTags.Any(nt => currentTags.Contains(nt.TagId)))
                    .Select(n => new
                    {
                        Novel = n,
                        SharedTags = n.NovelTags.Count(nt => currentTags.Contains(nt.TagId))
                    })
                    .OrderByDescending(x => x.SharedTags)
                    .ThenByDescending(x => x.Novel.Rating)
                    .Take(remainingCount)
                    .Select(x => new NovelListDto
                    {
                        Id = x.Novel.Id,
                        Title = x.Novel.Title,
                        Author = x.Novel.Author ?? string.Empty,
                        Rating = x.Novel.Rating,
                        ScrapedRating = x.Novel.ScrapedRating,
                        ViewCount = x.Novel.ViewCount,
                        Status = x.Novel.Status,
                        ChapterCount = x.Novel.ChapterCount,
                        LastUpdated = x.Novel.LastUpdated,
                        CoverUrl = x.Novel.CoverUrl,
                        Tags = x.Novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
                    })
                    .ToListAsync(cancellationToken);

                similarNovels.AddRange(tagBasedNovels);
            }

            return new Response<List<NovelListDto>>(similarNovels);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar novels for ID: {NovelId}", request.NovelId);
            return new Response<List<NovelListDto>>("Benzer romanlar alınamadı");
        }
    }
}
