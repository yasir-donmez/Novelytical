using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data.Entities;

public class ReviewReaction
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ReviewId { get; set; }

    [ForeignKey("ReviewId")]
    public Review Review { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    // 1 for Like, -1 for Dislike
    public int ReactionType { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
