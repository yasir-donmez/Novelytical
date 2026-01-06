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
                    Title = n.Title,
                    Author = n.Author ?? string.Empty,
                    Rating = n.Rating,
                    ChapterCount = n.ChapterCount,
                    LastUpdated = n.LastUpdated,
                    CoverUrl = n.CoverUrl,
                    Tags = n.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).Take(3).ToList()
                })
                .ToListAsync(cancellationToken);

            return new Response<List<NovelListDto>>(novels);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting novels by author: {Author}", request.Author);
            return new Response<List<NovelListDto>>("Yazarın diğer romanları alınamadı");
        }
    }
}
