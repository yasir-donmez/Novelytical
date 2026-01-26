namespace Novelytical.Application.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string FirebaseUid { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string Role { get; set; } = "User";
    public DateTime CreatedAt { get; set; }
}
