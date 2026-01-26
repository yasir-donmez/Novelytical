using System;

namespace Novelytical.Data.Entities;

public class PollOption
{
    public int Id { get; set; }
    
    public int PollId { get; set; }
    public CommunityPost Poll { get; set; } = null!;

    public string Text { get; set; } = string.Empty;
    public int VoteCount { get; set; } = 0; // Denormalized count

    // Optional: Link to a Novel (e.g. for "Which cover is better?")
    public int? RelatedNovelId { get; set; } 
    public Novel? RelatedNovel { get; set; }
}
