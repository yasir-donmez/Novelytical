namespace Novelytical.Application.DTOs;

/// <summary>
/// DTO for novel list display - optimized for performance with minimal fields
/// </summary>
public class NovelListDto
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty; // Added Slug
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public decimal? ScrapedRating { get; set; } // New field
    public int ViewCount { get; set; } // New field
    public string Status { get; set; } = "Unknown"; // New field
    public int ChapterCount { get; set; }
    public DateTime LastUpdated { get; set; }
    public string? CoverUrl { get; set; }
    
    /// <summary>
    /// Tag names only (not full Tag entities) for performance
    /// </summary>
    public List<string> Tags { get; set; } = new();
}
