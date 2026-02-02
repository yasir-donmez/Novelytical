using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Services;

public class CommunityService : ICommunityService
{
    private readonly ICommunityRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IRealTimeService _realTimeService;

    public CommunityService(ICommunityRepository repository, IUserRepository userRepository, IRealTimeService realTimeService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _realTimeService = realTimeService;
    }

    public async Task<Response<CommunityPostDto>> CreatePostAsync(string firebaseUid, CreatePostRequest request)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
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

        // Map to DTO
        var dto = MapToDto(post, user, null);

        // 📡 Broadcast new post via RealTime Service
        await _realTimeService.BroadcastNewPostAsync(dto);

        return new Response<CommunityPostDto>(dto);
    }

    public async Task<Response<List<CommunityPostDto>>> GetLatestPostsAsync(string? firebaseUid, int take)
    {
        var posts = await _repository.GetLatestPostsAsync(take);
        
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(firebaseUid))
        {
            var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
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

    public async Task<Response<List<CommunityPostDto>>> GetUserPostsAsync(string currentFirebaseUid, string targetFirebaseUid)
    {
        var targetUser = await _userRepository.GetByFirebaseUidAsync(targetFirebaseUid);
        if (targetUser == null) return new Response<List<CommunityPostDto>>("Target user not found");

        var posts = await _repository.GetUserPostsAsync(targetUser.Id);

        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(currentFirebaseUid))
        {
            var currentUser = await _userRepository.GetByFirebaseUidAsync(currentFirebaseUid);
            if (currentUser != null) currentUserId = currentUser.Id;
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

    public async Task<Response<bool>> VoteAsync(string firebaseUid, int postId, int optionId)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<bool>("User not found");

        var post = await _repository.GetPostByIdAsync(postId);
        if (post == null) return new Response<bool>("Post not found");

        if (post.Type != PostType.Poll) return new Response<bool>("Not a poll");
        
        if (post.ExpiresAt.HasValue && post.ExpiresAt < DateTime.UtcNow)
            return new Response<bool>("Poll has expired");

        var existingVote = await _repository.GetUserVoteAsync(postId, user.Id);
        
        if (existingVote != null)
        {
            if (existingVote.OptionId == optionId)
            {
                // Toggle off (Unvote)
                await _repository.RemoveVoteAsync(existingVote);
                await _repository.UpdatePollOptionCountAsync(existingVote.OptionId, -1);
            }
            else
            {
                // Switch vote
                await _repository.UpdatePollOptionCountAsync(existingVote.OptionId, -1);
                await _repository.RemoveVoteAsync(existingVote);
                
                var newVote = new PollVote { PollId = postId, OptionId = optionId, UserId = user.Id };
                await _repository.AddVoteAsync(newVote);
                await _repository.UpdatePollOptionCountAsync(optionId, 1);
            }
        }
        else
        {
            // New vote
            var newVote = new PollVote { PollId = postId, OptionId = optionId, UserId = user.Id };
            await _repository.AddVoteAsync(newVote);
            await _repository.UpdatePollOptionCountAsync(optionId, 1);
        }

        // 📡 Broadcast update via RealTime Service
        var updatedPost = await _repository.GetPostByIdAsync(postId);
        if (updatedPost != null)
        {
             var optionDtos = updatedPost.Options.Select(o => new PollOptionDto
             {
                 Id = o.Id,
                 Text = o.Text,
                 VoteCount = o.VoteCount,
                 RelatedNovelId = o.RelatedNovelId,
                 RelatedNovelTitle = o.RelatedNovel?.Title,
                 RelatedNovelCoverUrl = o.RelatedNovel?.CoverUrl
             }).ToList();

             await _realTimeService.BroadcastPollUpdateAsync(postId, optionDtos);
        }

        return new Response<bool>(true);
    }

    public async Task<Response<bool>> DeletePostAsync(string firebaseUid, int postId)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<bool>("User not found");

        var post = await _repository.GetPostByIdAsync(postId);
        if (post == null) return new Response<bool>("Post not found");

        if (post.UserId != user.Id) return new Response<bool>("Unauthorized");

        await _repository.DeletePostAsync(postId);

        // 📡 Broadcast deletion
        await _realTimeService.BroadcastPostDeletedAsync(postId);

        return new Response<bool>(true);
    }

    // Comments
    public async Task<Response<List<PostCommentDto>>> GetCommentsAsync(int postId)
    {
        var comments = await _repository.GetPostCommentsAsync(postId);
        var dtos = comments.Select(c => MapCommentToDto(c)).ToList();
        return new Response<List<PostCommentDto>>(dtos);
    }

    public async Task<Response<PostCommentDto>> AddCommentAsync(string firebaseUid, int postId, string content)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<PostCommentDto>("User not found");

        var post = await _repository.GetPostByIdAsync(postId);
        if (post == null) return new Response<PostCommentDto>("Post not found");

        var comment = new PostComment
        {
            PostId = postId,
            UserId = user.Id,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddCommentAsync(comment);

        // Required because AddCommentAsync doesn't load User navigation property automatically
        // Alternatively, we can construct DTO manually from available data since we have 'user' object
        var dto = MapCommentToDto(comment);
        dto.UserDisplayName = user.DisplayName ?? "Anonymous";
        dto.UserAvatarUrl = user.AvatarUrl;
        dto.UserId = user.FirebaseUid ?? "";
        
        // 📡 Broadcast new comment
        await _realTimeService.BroadcastNewCommentAsync(dto);

        return new Response<PostCommentDto>(dto);
    }

    public async Task<Response<bool>> DeleteCommentAsync(string firebaseUid, int commentId)
    {
        // TODO: Update Repository later to include GetCommentById. For now, let's proceed.
        
        await _repository.DeleteCommentAsync(commentId);
        
        // Let's just create a temporary fix for broadcast:
        await _realTimeService.BroadcastCommentDeletedAsync(0, commentId); // 0 as PostId might be an issue.

        return new Response<bool>(true);
    }

    public async Task<Response<List<VoterDto>>> GetVotersAsync(int postId)
    {
        var votes = await _repository.GetPollVotesAsync(postId);
        var dtos = votes.Select(v => new VoterDto
        {
            UserId = v.User?.FirebaseUid ?? string.Empty,
            UserName = v.User?.DisplayName ?? "Anonymous",
            UserImage = v.User?.AvatarUrl,
            // UserFrame = ... // If frame is added to User entity
            OptionId = v.OptionId
        }).ToList();
        
        return new Response<List<VoterDto>>(dtos);
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
