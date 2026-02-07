using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Community.Queries.GetPostComments;

public class GetPostCommentsQuery : IRequest<Response<List<PostCommentDto>>>
{
    public int PostId { get; set; }
}

public class GetPostCommentsQueryHandler : IRequestHandler<GetPostCommentsQuery, Response<List<PostCommentDto>>>
{
    private readonly ICommunityRepository _repository;

    public GetPostCommentsQueryHandler(ICommunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Response<List<PostCommentDto>>> Handle(GetPostCommentsQuery request, CancellationToken cancellationToken)
    {
        var comments = await _repository.GetPostCommentsAsync(request.PostId);
        var dtos = comments.Select(c => MapCommentToDto(c)).ToList();
        return new Response<List<PostCommentDto>>(dtos);
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
