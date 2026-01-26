using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data;

public class CommentReaction
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CommentId { get; set; }

    [ForeignKey("CommentId")]
    public Comment Comment { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    // 1 for Like, -1 for Dislike
    public int ReactionType { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
