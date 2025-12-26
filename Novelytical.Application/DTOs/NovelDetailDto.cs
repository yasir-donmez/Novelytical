namespace Novelytical.Application.DTOs;

/// <summary>
/// DTO for novel details page - includes description
/// </summary>
public class NovelDetailDto : NovelListDto
{
    public string Description { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
}
