namespace Novelytical.Application.DTOs;

/// <summary>
/// DTO for creating new novels
/// </summary>
public class CreateNovelDto
{
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public string? SourceUrl { get; set; }
    public int ChapterCount { get; set; }
    public decimal Rating { get; set; }
}
