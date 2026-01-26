using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data.Entities;

public class Review
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int NovelId { get; set; }
    
    [ForeignKey("NovelId")]
    public Novel Novel { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(5000)]
    public string Content { get; set; } = string.Empty;

    public double RatingOverall { get; set; }
    public double RatingStory { get; set; }
    public double RatingCharacters { get; set; }
    public double RatingWorld { get; set; }
    public double RatingFlow { get; set; }
    public double RatingGrammar { get; set; }

    public bool IsSpoiler { get; set; } = false;

    public int LikeCount { get; set; } = 0;
    public int DislikeCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
}
