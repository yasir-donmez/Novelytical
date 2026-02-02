using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Reviews.Commands.ToggleCommentReaction;

public class ToggleCommentReactionCommand : IRequest<Response<(int Likes, int Dislikes)>>
{
    public required string FirebaseUid { get; set; }
    public int CommentId { get; set; }
    public int ReactionType { get; set; }
}

public class ToggleCommentReactionCommandHandler : IRequestHandler<ToggleCommentReactionCommand, Response<(int Likes, int Dislikes)>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly Novelytical.Application.Interfaces.INotificationService _notificationService;

    public ToggleCommentReactionCommandHandler(IUserRepository userRepository, IReviewRepository reviewRepository, Novelytical.Application.Interfaces.INotificationService notificationService)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
        _notificationService = notificationService;
    }

    public async Task<Response<(int Likes, int Dislikes)>> Handle(ToggleCommentReactionCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<(int, int)>("User not found");

        var result = await _reviewRepository.ToggleCommentReactionAsync(request.CommentId, user.Id, request.ReactionType);

        // Notify if Like
        if (request.ReactionType == 1)
        {
            try
            {
                var comment = await _reviewRepository.GetCommentByIdAsync(request.CommentId);
                if (comment != null && comment.UserId != user.Id)
                {
                    var owner = await _userRepository.GetByIdAsync(comment.UserId);
                    if (owner != null)
                    {
                        await _notificationService.NotifyCommentLikeAsync(
                            owner.FirebaseUid,
                            user.DisplayName ?? "Bir kullanıcı",
                            user.AvatarUrl ?? "",
                            comment.Id.ToString(),
                            comment.NovelId.ToString()
                        );
                    }
                }
            }
            catch
            {
                // Silent fail
            }
        }

        return new Response<(int, int)>(result);
    }
}
