using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Novelytical.Data.Entities;

namespace Novelytical.Application.Features.Reviews.Queries.GetReviewsByUser;

public class GetReviewsByUserQuery : IRequest<Response<List<ReviewDto>>>
{
    public required string FirebaseUid { get; set; }
}

public class GetReviewsByUserQueryHandler : IRequestHandler<GetReviewsByUserQuery, Response<List<ReviewDto>>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;

    public GetReviewsByUserQueryHandler(IUserRepository userRepository, IReviewRepository reviewRepository)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<List<ReviewDto>>> Handle(GetReviewsByUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<List<ReviewDto>>("User not found");

        var reviews = await _reviewRepository.GetReviewsByUserIdAsync(user.Id);
        
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
