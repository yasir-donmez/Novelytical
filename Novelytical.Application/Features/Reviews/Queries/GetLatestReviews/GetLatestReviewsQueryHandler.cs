using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Reviews.Queries.GetLatestReviews;

public class GetLatestReviewsQuery : IRequest<Response<List<ReviewDto>>>
{
    public int Count { get; set; }
}

public class GetLatestReviewsQueryHandler : IRequestHandler<GetLatestReviewsQuery, Response<List<ReviewDto>>>
{
    private readonly IReviewRepository _reviewRepository;

    public GetLatestReviewsQueryHandler(IReviewRepository reviewRepository)
    {
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<List<ReviewDto>>> Handle(GetLatestReviewsQuery request, CancellationToken cancellationToken)
    {
        var reviews = await _reviewRepository.GetLatestReviewsAsync(request.Count);
        var dtos = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            NovelId = r.NovelId,
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
        return new Response<List<ReviewDto>>(dtos);
    }
}
