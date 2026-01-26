using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Novelytical.Application.Features.Reviews.Queries.GetReviews;

public class GetReviewsQuery : IRequest<Response<List<ReviewDto>>>
{
    public int NovelId { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class GetReviewsQueryHandler : IRequestHandler<GetReviewsQuery, Response<List<ReviewDto>>>
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IDistributedCache _cache;

    public GetReviewsQueryHandler(IReviewRepository reviewRepository, IDistributedCache cache)
    {
        _reviewRepository = reviewRepository;
        _cache = cache;
    }

    public async Task<Response<List<ReviewDto>>> Handle(GetReviewsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"reviews:{request.NovelId}:{request.Page}";
        var cachedData = await _cache.GetStringAsync(cacheKey, cancellationToken);

        if (!string.IsNullOrEmpty(cachedData))
        {
            var cachedDtos = JsonSerializer.Deserialize<List<ReviewDto>>(cachedData);
            if (cachedDtos != null) return new Response<List<ReviewDto>>(cachedDtos);
        }

        var reviews = await _reviewRepository.GetReviewsByNovelIdAsync(request.NovelId, (request.Page - 1) * request.PageSize, request.PageSize);
        var dtos = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            UserId = r.UserId.ToString(),
            Content = r.Content,
            IsSpoiler = r.IsSpoiler,
            LikeCount = r.LikeCount,
            DislikeCount = r.DislikeCount,
            UserDisplayName = r.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = r.User?.AvatarUrl,
            FirebaseUid = r.User?.FirebaseUid ?? string.Empty,
            RatingOverall = r.RatingOverall,
            RatingStory = r.RatingStory,
            RatingCharacters = r.RatingCharacters,
            RatingWorld = r.RatingWorld,
            RatingFlow = r.RatingFlow,
            RatingGrammar = r.RatingGrammar,
            CreatedAt = r.CreatedAt
        }).ToList();

        var options = new DistributedCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(1));
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dtos), options, cancellationToken);

        return new Response<List<ReviewDto>>(dtos);
    }
}
