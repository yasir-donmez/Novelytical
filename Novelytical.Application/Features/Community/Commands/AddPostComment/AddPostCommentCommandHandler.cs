using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Community.Commands.AddPostComment;

public class AddPostCommentCommand : IRequest<Response<PostCommentDto>>
{
    public required string FirebaseUid { get; set; }
    public int PostId { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class AddPostCommentCommandHandler : IRequestHandler<AddPostCommentCommand, Response<PostCommentDto>>
{
    private readonly ICommunityRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IRealTimeService _realTimeService;

    public AddPostCommentCommandHandler(ICommunityRepository repository, IUserRepository userRepository, IRealTimeService realTimeService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _realTimeService = realTimeService;
    }

    public async Task<Response<PostCommentDto>> Handle(AddPostCommentCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<PostCommentDto>("User not found");

        var post = await _repository.GetPostByIdAsync(request.PostId);
        if (post == null) return new Response<PostCommentDto>("Post not found");

        var comment = new PostComment
        {
            PostId = request.PostId,
            UserId = user.Id,
            Content = request.Content,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddCommentAsync(comment);

        // Required because AddCommentAsync doesn't load User navigation property automatically
        var dto = MapCommentToDto(comment);
        dto.UserDisplayName = user.DisplayName ?? "Anonymous";
        dto.UserAvatarUrl = user.AvatarUrl;
        dto.UserId = user.FirebaseUid ?? "";
        
        // 📡 Broadcast new comment
        await _realTimeService.BroadcastNewCommentAsync(dto);

        return new Response<PostCommentDto>(dto);
    }

    private PostCommentDto MapCommentToDto(PostComment comment)
    {
        return new PostCommentDto
        {
            Id = comment.Id,
            PostId = comment.PostId,
            UserId = comment.User?.FirebaseUid ?? string.Empty,
            UserDisplayName = comment.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = comment.User?.AvatarUrl,
            Content = comment.Content,
            CreatedAt = comment.CreatedAt
        };
    }
}
