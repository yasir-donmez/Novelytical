using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Reviews.Commands.ToggleCommentReaction;

public class ToggleCommentReactionCommand : IRequest<Response<(int Likes, int Dislikes)>>
{
    public string FirebaseUid { get; set; }
    public int CommentId { get; set; }
    public int ReactionType { get; set; }
}

public class ToggleCommentReactionCommandHandler : IRequestHandler<ToggleCommentReactionCommand, Response<(int Likes, int Dislikes)>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;

    public ToggleCommentReactionCommandHandler(IUserRepository userRepository, IReviewRepository reviewRepository)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<(int Likes, int Dislikes)>> Handle(ToggleCommentReactionCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<(int, int)>("User not found");

        var result = await _reviewRepository.ToggleCommentReactionAsync(request.CommentId, user.Id, request.ReactionType);
        return new Response<(int, int)>(result);
    }
}
