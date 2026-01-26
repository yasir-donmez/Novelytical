using System;

namespace Novelytical.Data.Entities;

public class PollVote
{
    public int Id { get; set; }
    
    public int PollId { get; set; }
    public CommunityPost Poll { get; set; } = null!;

    public int OptionId { get; set; }
    public PollOption Option { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
