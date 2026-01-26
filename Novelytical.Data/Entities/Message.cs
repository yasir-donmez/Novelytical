using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Novelytical.Data.Entities;

public class Message
{
    [Key]
    public int Id { get; set; }

    [Required]
    public Guid SenderId { get; set; }
    
    [ForeignKey("SenderId")]
    public User Sender { get; set; } = null!;

    [Required]
    public Guid ReceiverId { get; set; }
    
    [ForeignKey("ReceiverId")]
    public User Receiver { get; set; } = null!;

    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; } = false;
}
