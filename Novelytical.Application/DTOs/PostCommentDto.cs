using System;

namespace Novelytical.Application.DTOs;

public class PostCommentDto
{
    public int Id { get; set; }
    public int PostId { get; set; }
    
    public string UserId { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public string? UserFrame { get; set; }

    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
