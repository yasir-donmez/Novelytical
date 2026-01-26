using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data;

public class UserLibrary
{
    [Key]
    public int Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [Required]
    public int NovelId { get; set; }

    [ForeignKey("NovelId")]
    public virtual Novel Novel { get; set; } = null!;

    [Required]
    public int Status { get; set; }

    public int? CurrentChapter { get; set; }

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
