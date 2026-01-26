using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Interfaces;

public interface IReviewService
{
    Task<Response<bool>> AddCommentAsync(string firebaseUid, int novelId, CommentRequest request);
    Task<Response<bool>> AddReviewAsync(string firebaseUid, int novelId, ReviewRequest request);
    Task<Response<List<CommentDto>>> GetCommentsAsync(int novelId, int page, int pageSize);
    Task<Response<List<CommentDto>>> GetCommentsByUserIdAsync(string firebaseUid);
    Task<Response<List<ReviewDto>>> GetReviewsAsync(int novelId, int page, int pageSize);
    Task<Response<List<ReviewDto>>> GetReviewsByUserIdAsync(string firebaseUid);
    Task<Response<List<ReviewDto>>> GetLatestReviewsAsync(int count);

    Task<Response<(int Likes, int Dislikes)>> ToggleCommentReactionAsync(string firebaseUid, int commentId, int reactionType);
    Task<Response<(int Likes, int Dislikes)>> ToggleReviewReactionAsync(string firebaseUid, int reviewId, int reactionType);

    Task<Response<bool>> DeleteCommentAsync(string firebaseUid, int commentId);
    Task<Response<bool>> DeleteReviewAsync(string firebaseUid, int reviewId);
    Task<Response<bool>> UpdateReviewAsync(string firebaseUid, int novelId, ReviewRequest request);

    Task<Response<Dictionary<int, int>>> GetUserCommentReactionsAsync(string firebaseUid, List<int> commentIds);
    Task<Response<Dictionary<int, int>>> GetUserReviewReactionsAsync(string firebaseUid, List<int> reviewIds);
}
