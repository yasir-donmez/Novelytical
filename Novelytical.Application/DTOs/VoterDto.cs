namespace Novelytical.Application.DTOs;

public class VoterDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? UserImage { get; set; }
    public string? UserFrame { get; set; }
    public int OptionId { get; set; }
}
