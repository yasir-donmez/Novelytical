namespace Novelytical.Application.DTOs;

public class UserLibraryDto
{
    public int NovelId { get; set; }
    public string NovelTitle { get; set; } = string.Empty;
    public string NovelSlug { get; set; } = string.Empty;
    public string? CoverImage { get; set; }
    public int Status { get; set; }
    public int CurrentChapter { get; set; }
    public DateTime AddedAt { get; set; }
}
