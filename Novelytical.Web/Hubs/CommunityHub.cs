using Microsoft.AspNetCore.SignalR;

namespace Novelytical.Web.Hubs;

public class CommunityHub : Hub
{
    // Method for clients to join a specific group if needed (e.g., specific novel discussion)
    // For the main feed, they might just listen to "GlobalFeed"
    
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "CommunityFeed");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "CommunityFeed");
        await base.OnDisconnectedAsync(exception);
    }
}
