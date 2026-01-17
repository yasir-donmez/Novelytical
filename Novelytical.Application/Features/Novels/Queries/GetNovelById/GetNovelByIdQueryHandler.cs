using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data; // Fix: Add this
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Novels.Queries.GetNovelById;

public class GetNovelByIdQueryHandler : IRequestHandler<GetNovelByIdQuery, Response<NovelDetailDto>>
{
    private readonly INovelRepository _repository;

    public GetNovelByIdQueryHandler(INovelRepository repository)
    {
        _repository = repository;
    }

    public async Task<Response<NovelDetailDto>> Handle(GetNovelByIdQuery request, CancellationToken cancellationToken)
    {
        Novel? novel;

        // Determine if input is ID (int) or Slug (string)
        if (int.TryParse(request.IdOrSlug, out int id))
        {
            novel = await _repository.GetByIdAsync(id);
        }
        else
        {
            novel = await _repository.GetBySlugAsync(request.IdOrSlug);
        }

        if (novel == null)
            return new Response<NovelDetailDto>("Novel not found");

        // Manual mapping (Projection is faster than AutoMapper)
        var dto = new NovelDetailDto
        {
            Id = novel.Id,
            Slug = novel.Slug, // Map Slug
            Title = novel.Title,
            Author = novel.Author ?? string.Empty,
            Description = novel.Description ?? string.Empty,
            Rating = novel.Rating,
            ScrapedRating = novel.ScrapedRating, // New
            ViewCount = novel.ViewCount,         // New
            Status = novel.Status,               // New
            ChapterCount = novel.ChapterCount,
            LastUpdated = novel.LastUpdated,
            CoverUrl = novel.CoverUrl,
            SourceUrl = novel.SourceUrl,
            Tags = novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).ToList()
        };

        // Use ScrapedRating if available, otherwise mock or default
        if (novel.ScrapedRating.HasValue && novel.ScrapedRating.Value > 0)
        {
            dto.AverageRating = (double)novel.ScrapedRating.Value;
            dto.RatingCount = novel.ViewCount / 10000; // 10k views = 1 vote
        }
        else
        {
            // Fallback Mock
            var seed = novel.Id * 17 + 42; 
            var random = new Random(seed);
            dto.AverageRating = Math.Round(3.5 + (random.NextDouble() * 1.5), 1); 
            dto.RatingCount = random.Next(100, 5000); 
        }

        return new Response<NovelDetailDto>(dto);
    }
}
