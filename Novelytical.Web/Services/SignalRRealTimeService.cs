using Microsoft.AspNetCore.SignalR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Web.Hubs;

namespace Novelytical.Web.Services;

public class SignalRRealTimeService : IRealTimeService
{
    private readonly IHubContext<CommunityHub> _hubContext;

    public SignalRRealTimeService(IHubContext<CommunityHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task BroadcastNewPostAsync(CommunityPostDto post)
    {
        await _hubContext.Clients.Group("CommunityFeed").SendAsync("ReceiveNewPost", post);
    }

    public async Task BroadcastPollUpdateAsync(int postId, List<PollOptionDto> options)
    {
        await _hubContext.Clients.Group("CommunityFeed").SendAsync("ReceivePollUpdate", new { PostId = postId, Options = options });
    }

    public async Task BroadcastPostDeletedAsync(int postId)
    {
        await _hubContext.Clients.Group("CommunityFeed").SendAsync("ReceivePostDeleted", postId);
    }

    public async Task BroadcastNewCommentAsync(PostCommentDto comment)
    {
        await _hubContext.Clients.Group("CommunityFeed").SendAsync("ReceiveNewComment", comment);
    }

    public async Task BroadcastCommentDeletedAsync(int postId, int commentId)
    {
        await _hubContext.Clients.Group("CommunityFeed").SendAsync("ReceiveCommentDeleted", new { PostId = postId, CommentId = commentId });
    }
}
