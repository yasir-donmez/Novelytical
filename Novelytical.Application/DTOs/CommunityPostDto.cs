using System;
using System.Collections.Generic;

namespace Novelytical.Application.DTOs;

public class CommunityPostDto
{
    public int Id { get; set; }
    
    public string UserId { get; set; } = string.Empty; // Firebase UID
    public string UserDisplayName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public string? UserFrame { get; set; }

    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // "text", "poll", "room"

    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    // Poll Specific
    public List<PollOptionDto> Options { get; set; } = new();
    public int? UserVotedOptionId { get; set; }

    // Room Specific
    public string? RoomTitle { get; set; }
    public int? ParticipantCount { get; set; }
}

public class PollOptionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int VoteCount { get; set; }
    
    public int? RelatedNovelId { get; set; }
    public string? RelatedNovelTitle { get; set; }
    public string? RelatedNovelCoverUrl { get; set; }
}
