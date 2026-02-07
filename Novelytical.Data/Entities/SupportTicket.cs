using System.ComponentModel.DataAnnotations;

namespace Novelytical.Data.Entities;

public class SupportTicket
{
    public int Id { get; set; }
    
    // Optional: Link to a registered user
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsResolved { get; set; } = false;
    public string? AdminNotes { get; set; }
}
