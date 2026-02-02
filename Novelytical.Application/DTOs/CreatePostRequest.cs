using System.Collections.Generic;

namespace Novelytical.Application.DTOs;

public class CreatePostRequest
{
    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // "text", "poll", "room"

    // Poll Specific
    public List<CreatePollOptionRequest> Options { get; set; } = new();
    public int DurationHours { get; set; } = 24;

    // Room Specific
    public string? RoomTitle { get; set; }
}

public class CreatePollOptionRequest
{
    public string Text { get; set; } = string.Empty;
    public int? RelatedNovelId { get; set; }
}
