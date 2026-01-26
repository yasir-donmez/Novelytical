using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Novelytical.Application.Helpers;
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Features.Reviews.Commands.DeleteComment;

public class DeleteCommentCommand : IRequest<Response<bool>>
{
    public required string FirebaseUid { get; set; }
    public int CommentId { get; set; }
}

public class DeleteCommentCommandHandler : IRequestHandler<DeleteCommentCommand, Response<bool>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly INovelRepository _novelRepository;
    private readonly IDistributedCache _cache;

    public DeleteCommentCommandHandler(IUserRepository userRepository, IReviewRepository reviewRepository, INovelRepository novelRepository, IDistributedCache cache)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
        _novelRepository = novelRepository;
        _cache = cache;
    }

    public async Task<Response<bool>> Handle(DeleteCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await _reviewRepository.GetCommentByIdAsync(request.CommentId);
        if (comment == null) return new Response<bool>("Comment not found");

        // Optional: Check ownership here
        // var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        // if (user.Id != comment.UserId) return new Response<bool>("Unauthorized");

        await _reviewRepository.DeleteCommentAsync(request.CommentId);
        
        await _cache.RemoveAsync($"comments:{comment.NovelId}:fulltree", cancellationToken);
        
        var count = await _reviewRepository.GetCommentCountAsync(comment.NovelId);
        await _novelRepository.UpdateCommentCountAsync(comment.NovelId, count);
        
        return new Response<bool>(true);
    }
}
