using Microsoft.EntityFrameworkCore;
using Novelytical.Data;
using Novelytical.Data.Interfaces;

namespace Novelytical.Data.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _context;

    public ReviewRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Comment> AddCommentAsync(Comment comment)
    {
        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    public async Task<Review> AddReviewAsync(Review review)
    {
        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        return review;
    }

    public async Task<List<Comment>> GetCommentsByNovelIdAsync(int novelId, int skip, int take)
    {
        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Replies.Where(r => !r.IsDeleted)) // Load non-deleted replies
                .ThenInclude(r => r.User) // Load user for replies
            .Where(c => c.NovelId == novelId && !c.IsDeleted && c.ParentId == null) // Root comments only
            .OrderByDescending(c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<List<Comment>> GetAllCommentsForNovelAsync(int novelId)
    {
        // Fetch ALL comments for novel (Deleted excluded)
        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.User)
            .Where(c => c.NovelId == novelId) // Fetch ALL (deleted included) to build tree
            .OrderBy(c => c.CreatedAt) // Order by creation time to help processing
            .OrderBy(c => c.CreatedAt) // Order by creation time to help processing
            .ToListAsync();
    }

    public async Task<Review?> GetReviewByUserAsync(int novelId, Guid userId)
    {
        return await _context.Reviews
            .FirstOrDefaultAsync(r => r.NovelId == novelId && r.UserId == userId && !r.IsDeleted);
    }

    public async Task UpdateReviewAsync(Review review)
    {
        _context.Reviews.Update(review);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteCommentAsync(int commentId)
    {
        var comment = await _context.Comments.FindAsync(commentId);
        if (comment != null)
        {
            comment.IsDeleted = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<Review>> GetLatestReviewsAsync(int count)
    {
        return await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Novel) // Assuming Novel navigation exists
            .OrderByDescending(r => r.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task DeleteReviewAsync(int reviewId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review != null)
        {
            review.IsDeleted = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<Comment?> GetCommentByIdAsync(int commentId)
    {
        return await _context.Comments.FindAsync(commentId);
    }

    public async Task<Review?> GetReviewByIdAsync(int reviewId)
    {
        return await _context.Reviews.FindAsync(reviewId);
    }

    public async Task<List<Comment>> GetCommentsByUserIdAsync(Guid userId)
    {
        // Fetch comments by user, include User and Novel (if needed, but User is redundant if we query by User)
        // Usually UI needs Novel info to show what they commented on.
        // Assuming Comment has navigation property to Novel (NovelId is FK).
        // Let's check Comment entity later if needed, but usually it does.
        return await _context.Comments
            .Include(c => c.User)
            // .Include(c => c.Novel) // Ideally we need this for the UI "Novel Title" etc.
            .Where(c => c.UserId == userId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Review>> GetReviewsByUserIdAsync(Guid userId)
    {
        return await _context.Reviews
            .Include(r => r.User)
            // .Include(r => r.Novel) // Ideally include Novel
            .Where(r => r.UserId == userId && !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Review>> GetReviewsByNovelIdAsync(int novelId, int skip, int take)
    {
        return await _context.Reviews
            .Include(r => r.User)
            .Where(r => r.NovelId == novelId && !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<int> GetCommentCountAsync(int novelId)
    {
        return await _context.Comments.CountAsync(c => c.NovelId == novelId && !c.IsDeleted);
    }

    public async Task<int> GetReviewCountAsync(int novelId)
    {
        return await _context.Reviews.CountAsync(r => r.NovelId == novelId && !r.IsDeleted);
    }

    public async Task<double> CalculateAverageRatingAsync(int novelId)
    {
        var ratings = await _context.Reviews
            .Where(r => r.NovelId == novelId && !r.IsDeleted)
            .Select(r => r.RatingOverall)
            .ToListAsync();

        if (!ratings.Any()) return 0;
        return ratings.Average();
    }

    public async Task<(int Likes, int Dislikes)> ToggleCommentReactionAsync(int commentId, Guid userId, int reactionType)
    {
        var existingReaction = await _context.CommentReactions
            .FirstOrDefaultAsync(cr => cr.CommentId == commentId && cr.UserId == userId);

        var comment = await _context.Comments.FindAsync(commentId);
        if (comment == null) throw new KeyNotFoundException("Comment not found");

        if (existingReaction != null)
        {
            if (existingReaction.ReactionType == reactionType)
            {
                // Toggle off (Remove)
                _context.CommentReactions.Remove(existingReaction);
                if (reactionType == 1) comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
                else if (reactionType == -1) comment.DislikeCount = Math.Max(0, comment.DislikeCount - 1);
            }
            else
            {
                // Switch
                if (existingReaction.ReactionType == 1) comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
                else comment.DislikeCount = Math.Max(0, comment.DislikeCount - 1);

                existingReaction.ReactionType = reactionType;
                
                if (reactionType == 1) comment.LikeCount++;
                else comment.DislikeCount++;
            }
        }
        else
        {
            // Add New
            var newReaction = new CommentReaction { CommentId = commentId, UserId = userId, ReactionType = reactionType };
            _context.CommentReactions.Add(newReaction);
            if (reactionType == 1) comment.LikeCount++;
            else comment.DislikeCount++;
        }

        await _context.SaveChangesAsync();
        return (comment.LikeCount, comment.DislikeCount);
    }

    public async Task<(int Likes, int Dislikes)> ToggleReviewReactionAsync(int reviewId, Guid userId, int reactionType)
    {
        var existingReaction = await _context.ReviewReactions
            .FirstOrDefaultAsync(rr => rr.ReviewId == reviewId && rr.UserId == userId);

        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null) throw new KeyNotFoundException("Review not found");

        if (existingReaction != null)
        {
            if (existingReaction.ReactionType == reactionType)
            {
                _context.ReviewReactions.Remove(existingReaction);
                if (reactionType == 1) review.LikeCount = Math.Max(0, review.LikeCount - 1);
                else if (reactionType == -1) review.DislikeCount = Math.Max(0, review.DislikeCount - 1);
            }
            else
            {
                if (existingReaction.ReactionType == 1) review.LikeCount = Math.Max(0, review.LikeCount - 1);
                else review.DislikeCount = Math.Max(0, review.DislikeCount - 1);

                existingReaction.ReactionType = reactionType;

                if (reactionType == 1) review.LikeCount++;
                else review.DislikeCount++;
            }
        }
        else
        {
            var newReaction = new ReviewReaction { ReviewId = reviewId, UserId = userId, ReactionType = reactionType };
            _context.ReviewReactions.Add(newReaction);
            if (reactionType == 1) review.LikeCount++;
            else review.DislikeCount++;
        }

        await _context.SaveChangesAsync();
        return (review.LikeCount, review.DislikeCount);
    }

    public async Task<Dictionary<int, int>> GetUserCommentReactionsAsync(List<int> commentIds, Guid userId)
    {
        return await _context.CommentReactions
            .Where(cr => cr.UserId == userId && commentIds.Contains(cr.CommentId))
            .ToDictionaryAsync(cr => cr.CommentId, cr => cr.ReactionType);
    }

    public async Task<Dictionary<int, int>> GetUserReviewReactionsAsync(List<int> reviewIds, Guid userId)
    {
        return await _context.ReviewReactions
            .Where(rr => rr.UserId == userId && reviewIds.Contains(rr.ReviewId))
            .ToDictionaryAsync(rr => rr.ReviewId, rr => rr.ReactionType);
    }
}
