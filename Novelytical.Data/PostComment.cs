using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data;

public class PostComment
{
    [Key]
    public int Id { get; set; }

    public int PostId { get; set; }
    [ForeignKey("PostId")]
    public CommunityPost Post { get; set; } = null!;

    public Guid UserId { get; set; }
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Optional: Replies/ParentId if we want threaded comments later (keeping simple for now as per Firebase structure)
}
