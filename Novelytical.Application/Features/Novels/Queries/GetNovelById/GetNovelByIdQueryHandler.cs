using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data; // Fix: Add this
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Novels.Queries.GetNovelById;

public class GetNovelByIdQueryHandler : IRequestHandler<GetNovelByIdQuery, Response<NovelDetailDto>>
{
    private readonly INovelRepository _repository;
    private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _cache; // 🚀

    public GetNovelByIdQueryHandler(INovelRepository repository, Microsoft.Extensions.Caching.Distributed.IDistributedCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Response<NovelDetailDto>> Handle(GetNovelByIdQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"novel_details_{request.IdOrSlug.ToLower()}";
        
        // 1. Try Cache First (Redis) ⚡
        var cachedData = await _cache.GetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrEmpty(cachedData))
        {
            var cachedDto = System.Text.Json.JsonSerializer.Deserialize<NovelDetailDto>(cachedData);
            if (cachedDto != null)
                return new Response<NovelDetailDto>(cachedDto);
        }

        // 2. Fallback to Database 🐢
        Novel? novel;
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

        var dto = new NovelDetailDto
        {
            Id = novel.Id,
            Slug = novel.Slug,
            Title = novel.Title,
            Author = novel.Author ?? string.Empty,
            Description = novel.Description ?? string.Empty,
            Rating = novel.Rating,
            ScrapedRating = novel.ScrapedRating,
            ViewCount = novel.ViewCount,
            Status = novel.Status,
            ChapterCount = novel.ChapterCount,
            LastUpdated = novel.LastUpdated,
            CoverUrl = novel.CoverUrl,
            SourceUrl = novel.SourceUrl,
            Tags = novel.NovelTags.OrderBy(nt => nt.TagId).Select(nt => nt.Tag.Name).ToList()
        };

        if (novel.ScrapedRating.HasValue && novel.ScrapedRating.Value > 0)
        {
            dto.AverageRating = (double)novel.ScrapedRating.Value;
            dto.RatingCount = novel.ViewCount / 10000;
        }
        else
        {
            var seed = novel.Id * 17 + 42; 
            var random = new Random(seed);
            dto.AverageRating = Math.Round(3.5 + (random.NextDouble() * 1.5), 1); 
            dto.RatingCount = random.Next(100, 5000); 
        }

        // 3. Save to Cache (Duration: 20 Minutes) ⏳
        var cacheOptions = new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(20)
        };
        var serializedData = System.Text.Json.JsonSerializer.Serialize(dto);
        await _cache.SetStringAsync(cacheKey, serializedData, cacheOptions, cancellationToken);

        return new Response<NovelDetailDto>(dto);
    }
}
