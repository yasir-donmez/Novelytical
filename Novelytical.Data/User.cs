using System.ComponentModel.DataAnnotations;

namespace Novelytical.Data;

public class User
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(128)]
    public string FirebaseUid { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(100)]
    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
