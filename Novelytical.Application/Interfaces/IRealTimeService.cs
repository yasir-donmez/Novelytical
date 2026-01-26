using Novelytical.Application.DTOs;

namespace Novelytical.Application.Interfaces;

public interface IRealTimeService
{
    Task BroadcastNewPostAsync(CommunityPostDto post);
    Task BroadcastPollUpdateAsync(int postId, List<PollOptionDto> options);
    Task BroadcastPostDeletedAsync(int postId);
    
    Task BroadcastNewCommentAsync(PostCommentDto comment);
    Task BroadcastCommentDeletedAsync(int postId, int commentId);
}
