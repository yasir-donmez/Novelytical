using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Novelytical.Data.Entities;

namespace Novelytical.Application.Features.Reviews.Queries.GetCommentsByUser;

public class GetCommentsByUserQuery : IRequest<Response<List<CommentDto>>>
{
    public string FirebaseUid { get; set; }
}

public class GetCommentsByUserQueryHandler : IRequestHandler<GetCommentsByUserQuery, Response<List<CommentDto>>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;

    public GetCommentsByUserQueryHandler(IUserRepository userRepository, IReviewRepository reviewRepository)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<List<CommentDto>>> Handle(GetCommentsByUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<List<CommentDto>>("User not found");

        var comments = await _reviewRepository.GetCommentsByUserIdAsync(user.Id);
        
        var dtos = comments.Select(c => new CommentDto
        {
            Id = c.Id,
            NovelId = c.NovelId,
            UserId = c.UserId.ToString(),
            Content = c.Content,
            IsSpoiler = c.IsSpoiler,
            LikeCount = c.LikeCount,
            DislikeCount = c.DislikeCount,
            UserDisplayName = c.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = c.User?.AvatarUrl,
            FirebaseUid = c.User?.FirebaseUid ?? string.Empty,
            CreatedAt = c.CreatedAt,
            ParentId = c.ParentId,
            IsDeleted = c.IsDeleted,
            Replies = new List<CommentDto>() 
        }).ToList();
        
        return new Response<List<CommentDto>>(dtos);
    }
}
