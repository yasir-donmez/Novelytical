namespace Novelytical.Application.DTOs;

public class CommentDto
{
    public int Id { get; set; }
    public int NovelId { get; set; } // Added NovelId
    public string UserId { get; set; } = string.Empty;
    public string FirebaseUid { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public bool IsSpoiler { get; set; }
    public bool IsDeleted { get; set; }
    public int LikeCount { get; set; }
    public int DislikeCount { get; set; }

    public int? ParentId { get; set; }
    public List<CommentDto> Replies { get; set; } = new();
}
