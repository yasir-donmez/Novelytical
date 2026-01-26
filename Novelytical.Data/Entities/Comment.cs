using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data.Entities;

public class Comment
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
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;

    public bool IsSpoiler { get; set; } = false;

    public int LikeCount { get; set; } = 0;
    public int DislikeCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? ParentId { get; set; }
    [ForeignKey("ParentId")]
    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();

    public bool IsDeleted { get; set; } = false;
}
