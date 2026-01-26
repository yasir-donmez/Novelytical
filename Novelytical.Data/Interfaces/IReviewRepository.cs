using Novelytical.Data.Entities; 
using Novelytical.Data;

namespace Novelytical.Data.Interfaces;

public interface IReviewRepository
{
    Task<Comment> AddCommentAsync(Comment comment);
    Task<Review> AddReviewAsync(Review review);
    Task<List<Comment>> GetCommentsByNovelIdAsync(int novelId, int skip, int take);
    Task<List<Comment>> GetCommentsByUserIdAsync(Guid userId);
    Task<List<Comment>> GetAllCommentsForNovelAsync(int novelId);
    Task<List<Review>> GetReviewsByNovelIdAsync(int novelId, int skip, int take);
    Task<List<Review>> GetReviewsByUserIdAsync(Guid userId);
    Task<List<Review>> GetLatestReviewsAsync(int count);
    Task<int> GetCommentCountAsync(int novelId);
    Task<int> GetReviewCountAsync(int novelId);
    Task<double> CalculateAverageRatingAsync(int novelId);
    
    Task<Review?> GetReviewByUserAsync(int novelId, Guid userId);
    Task UpdateReviewAsync(Review review);
    Task<Comment?> GetCommentByIdAsync(int commentId);
    Task<Review?> GetReviewByIdAsync(int reviewId);
    Task DeleteCommentAsync(int commentId);
    Task DeleteReviewAsync(int reviewId);

    Task<(int Likes, int Dislikes)> ToggleCommentReactionAsync(int commentId, Guid userId, int reactionType);
    Task<(int Likes, int Dislikes)> ToggleReviewReactionAsync(int reviewId, Guid userId, int reactionType);
    Task<Dictionary<int, int>> GetUserCommentReactionsAsync(List<int> commentIds, Guid userId);
    Task<Dictionary<int, int>> GetUserReviewReactionsAsync(List<int> reviewIds, Guid userId);
}
