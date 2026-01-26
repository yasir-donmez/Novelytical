using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Novels.Queries.GetNovelsByAuthor;

public class GetNovelsByAuthorQueryHandler : IRequestHandler<GetNovelsByAuthorQuery, Response<List<NovelListDto>>>
{
    private readonly INovelRepository _repository;
    private readonly ILogger<GetNovelsByAuthorQueryHandler> _logger;

    public GetNovelsByAuthorQueryHandler(INovelRepository repository, ILogger<GetNovelsByAuthorQueryHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Response<List<NovelListDto>>> Handle(GetNovelsByAuthorQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var novels = await _repository.GetOptimizedQuery()
                .Where(n => n.Author == request.Author && n.Id != request.ExcludeId)
                .OrderByDescending(n => n.Rating)
                .Take(request.PageSize)
                .Select(n => new NovelListDto
                {
                    Id = n.Id,
                    Slug = n.Slug, // Map Slug
                    Title = n.Title,
                    Author = n.Author ?? string.Empty,
                    Rating = n.Rating,
                    ScrapedRating = n.ScrapedRating,
                    ViewCount = n.ViewCount,
                    SiteViewCount = n.SiteViewCount,
                    ChapterCount = n.ChapterCount,
                    LastUpdated = n.LastUpdated,
                    CoverUrl = n.CoverUrl,
                    Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
                })
                .ToListAsync(cancellationToken);

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

            return new Response<List<NovelListDto>>(novels);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting novels by author: {Author}", request.Author);
            return new Response<List<NovelListDto>>("Yazarın diğer romanları alınamadı");
        }
    }
}
