using System;
using System.Collections.Generic;

namespace Novelytical.Data.Entities;

public enum PostType
{
    Text = 0,
    Poll = 1,
    Room = 2
}

public class CommunityPost
{
    public int Id { get; set; }
    
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Content { get; set; } = string.Empty; // The question or text content
    
    public PostType Type { get; set; } = PostType.Text;
    
    // Room Spec
    public string? RoomTitle { get; set; }
    public int? ParticipantCount { get; set; } // Optional/Cached

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; } // Only for Polls

    // Navigation
    public ICollection<PollOption> Options { get; set; } = new List<PollOption>();
    public ICollection<PollVote> Votes { get; set; } = new List<PollVote>();
    public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
    
    // Soft Delete
    public bool IsDeleted { get; set; }
}
