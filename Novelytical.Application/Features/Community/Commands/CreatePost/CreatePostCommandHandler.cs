using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;
using System;

namespace Novelytical.Application.Features.Community.Commands.CreatePost;

public class CreatePostCommand : IRequest<Response<CommunityPostDto>>
{
    public required string FirebaseUid { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // "text", "poll", "room"
    
    // Poll Specific
    public List<CreatePollOptionRequest> Options { get; set; } = new();
    public int DurationHours { get; set; } = 24;

    // Room Specific
    public string? RoomTitle { get; set; }
}

public class CreatePostCommandHandler : IRequestHandler<CreatePostCommand, Response<CommunityPostDto>>
{
    private readonly ICommunityRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IRealTimeService _realTimeService;

    public CreatePostCommandHandler(ICommunityRepository repository, IUserRepository userRepository, IRealTimeService realTimeService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _realTimeService = realTimeService;
    }

    public async Task<Response<CommunityPostDto>> Handle(CreatePostCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<CommunityPostDto>("User not found");

        var post = new CommunityPost
        {
            UserId = user.Id,
            Content = request.Content,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            Type = request.Type == "poll" ? PostType.Poll : (request.Type == "room" ? PostType.Room : PostType.Text),
            RoomTitle = request.RoomTitle
        };

        if (post.Type == PostType.Poll)
        {
            if (request.Options.Count < 2) return new Response<CommunityPostDto>("At least 2 options are required for polls");
            
            post.ExpiresAt = DateTime.UtcNow.AddHours(request.DurationHours);
            post.Options = request.Options.Select(o => new PollOption
            {
                Text = o.Text,
                RelatedNovelId = o.RelatedNovelId,
                VoteCount = 0
            }).ToList();
        }

        await _repository.CreatePostAsync(post);

        // Reload to fetch navigation properties (RelatedNovel for covers)
        var createdPost = await _repository.GetPostByIdAsync(post.Id);
        if (createdPost == null) return new Response<CommunityPostDto>("Error creating post");

        // Map to DTO
        var dto = MapToDto(createdPost, user, null);

        // 📡 Broadcast new post via RealTime Service
        await _realTimeService.BroadcastNewPostAsync(dto);

        return new Response<CommunityPostDto>(dto);
    }

    private CommunityPostDto MapToDto(CommunityPost post, User user, int? votedOptionId)
    {
        return new CommunityPostDto
        {
            Id = post.Id,
            UserId = user.FirebaseUid ?? string.Empty,
            UserDisplayName = user.DisplayName ?? "Anonymous",
            UserAvatarUrl = user.AvatarUrl,
            // UserFrame = ... 
            Content = post.Content,
            Type = post.Type == PostType.Poll ? "poll" : (post.Type == PostType.Room ? "room" : "text"),
            RoomTitle = post.RoomTitle,
            ParticipantCount = post.ParticipantCount,
            CreatedAt = post.CreatedAt,
            ExpiresAt = post.ExpiresAt,
            UserVotedOptionId = votedOptionId,
            Options = post.Options.Select(o => new PollOptionDto
            {
                Id = o.Id,
                Text = o.Text,
                VoteCount = o.VoteCount,
                RelatedNovelId = o.RelatedNovelId,
                RelatedNovelTitle = o.RelatedNovel?.Title,
                RelatedNovelCoverUrl = o.RelatedNovel?.CoverUrl
            }).ToList()
        };
    }
}
