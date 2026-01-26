using System.Collections.Generic;

namespace Novelytical.Application.DTOs;

public class CreatePostRequest
{
    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // "text" or "poll"

    // Poll Specific
    public List<CreatePollOptionRequest> Options { get; set; } = new();
    public int DurationHours { get; set; } = 24;
}

public class CreatePollOptionRequest
{
    public string Text { get; set; } = string.Empty;
    public int? RelatedNovelId { get; set; }
}
