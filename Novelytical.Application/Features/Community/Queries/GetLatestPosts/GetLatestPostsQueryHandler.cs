using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Community.Queries.GetLatestPosts;

public class GetLatestPostsQuery : IRequest<Response<List<CommunityPostDto>>>
{
    public string? FirebaseUid { get; set; }
    public int Take { get; set; } = 20;
}

public class GetLatestPostsQueryHandler : IRequestHandler<GetLatestPostsQuery, Response<List<CommunityPostDto>>>
{
    private readonly ICommunityRepository _repository;
    private readonly IUserRepository _userRepository;

    public GetLatestPostsQueryHandler(ICommunityRepository repository, IUserRepository userRepository)
    {
        _repository = repository;
        _userRepository = userRepository;
    }

    public async Task<Response<List<CommunityPostDto>>> Handle(GetLatestPostsQuery request, CancellationToken cancellationToken)
    {
        var posts = await _repository.GetLatestPostsAsync(request.Take);
        
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(request.FirebaseUid))
        {
            var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
            if (user != null) currentUserId = user.Id;
        }

        List<PollVote> userVotes = new List<PollVote>();
        if (currentUserId.HasValue)
        {
            var pollPostIds = posts.Where(p => p.Type == PostType.Poll).Select(p => p.Id).ToList();
            if (pollPostIds.Any())
            {
                userVotes = await _repository.GetUserVotesForPostsAsync(pollPostIds, currentUserId.Value);
            }
        }

        var dtos = new List<CommunityPostDto>();
        foreach (var post in posts)
        {
            int? votedOptionId = null;
            if (currentUserId.HasValue && post.Type == PostType.Poll)
            {
                var vote = userVotes.FirstOrDefault(v => v.PollId == post.Id);
                if (vote != null) votedOptionId = vote.OptionId;
            }
            dtos.Add(MapToDto(post, post.User, votedOptionId));
        }

        return new Response<List<CommunityPostDto>>(dtos);
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
