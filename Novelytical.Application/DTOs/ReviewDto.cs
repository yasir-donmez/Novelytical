namespace Novelytical.Application.DTOs;

public class ReviewDto : CommentDto
{
    public double RatingOverall { get; set; }
    public double RatingStory { get; set; }
    public double RatingCharacters { get; set; }
    public double RatingWorld { get; set; }
    public double RatingFlow { get; set; }
    public double RatingGrammar { get; set; }
}
