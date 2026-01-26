namespace Novelytical.Application.DTOs;

public class CommentRequest
{
    public string Content { get; set; } = string.Empty;
    public bool IsSpoiler { get; set; }
    public int? ParentId { get; set; }
}
