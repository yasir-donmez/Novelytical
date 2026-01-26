using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Reviews.Commands.ToggleReviewReaction;

public class ToggleReviewReactionCommand : IRequest<Response<(int Likes, int Dislikes)>>
{
    public string FirebaseUid { get; set; }
    public int ReviewId { get; set; }
    public int ReactionType { get; set; }
}

public class ToggleReviewReactionCommandHandler : IRequestHandler<ToggleReviewReactionCommand, Response<(int Likes, int Dislikes)>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;

    public ToggleReviewReactionCommandHandler(IUserRepository userRepository, IReviewRepository reviewRepository)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<(int Likes, int Dislikes)>> Handle(ToggleReviewReactionCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<(int, int)>("User not found");

        var result = await _reviewRepository.ToggleReviewReactionAsync(request.ReviewId, user.Id, request.ReactionType);
        return new Response<(int, int)>(result);
    }
}
