using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
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
        var novel = await _repository.GetByIdAsync(request.Id);

        if (novel == null)
            return new Response<NovelDetailDto>("Novel not found");

        // Manual mapping (Projection is faster than AutoMapper)
        var dto = new NovelDetailDto
        {
            Id = novel.Id,
            Title = novel.Title,
            Author = novel.Author ?? string.Empty,
            Description = novel.Description ?? string.Empty,
            Rating = novel.Rating,
            ChapterCount = novel.ChapterCount,
            LastUpdated = novel.LastUpdated,
            CoverUrl = novel.CoverUrl,
            SourceUrl = novel.SourceUrl,
            Tags = novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).ToList()
        };

        // Mock rating data (Simulated for Phase 4) // TODO: Replace with real rating system
        var seed = novel.Id * 17 + 42; // Consistent seed
        var random = new Random(seed);
        dto.AverageRating = Math.Round(3.5 + (random.NextDouble() * 1.5), 1); // 3.5-5.0
        dto.RatingCount = random.Next(100, 5000); // 100-5000 range

        return new Response<NovelDetailDto>(dto);
    }
}
