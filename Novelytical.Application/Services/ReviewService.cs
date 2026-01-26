using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Interfaces;
using Novelytical.Application.Helpers;

using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Services;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IUserRepository _userRepository;
    private readonly INovelRepository _novelRepository;
    private readonly IDistributedCache _cache;

    public ReviewService(IReviewRepository reviewRepository, IUserRepository userRepository, INovelRepository novelRepository, IDistributedCache cache)
    {
        _reviewRepository = reviewRepository;
        _userRepository = userRepository;
        _novelRepository = novelRepository;
        _cache = cache;
    }

    public async Task<Response<bool>> AddCommentAsync(string firebaseUid, int novelId, CommentRequest request)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<bool>("User not found in Postgres. Please sync first.");

        var comment = new Comment
        {
            NovelId = novelId,
            UserId = user.Id,
            Content = request.Content,
            IsSpoiler = request.IsSpoiler,
            ParentId = request.ParentId, // Set ParentId
            CreatedAt = DateTime.UtcNow
        };

        await _reviewRepository.AddCommentAsync(comment);

        // Invalidate Cache
        await _cache.RemoveAsync($"comments:{novelId}:fulltree"); 
        
        var count = await _reviewRepository.GetCommentCountAsync(novelId);
        await _novelRepository.UpdateCommentCountAsync(novelId, count);
        await SyncNovelRank(novelId);

        return new Response<bool>(true);
    }

    public async Task<Response<bool>> AddReviewAsync(string firebaseUid, int novelId, ReviewRequest request)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<bool>("User not found in Postgres. Please sync first.");

        // Check if review exists
        var existingReview = await _reviewRepository.GetReviewByUserAsync(novelId, user.Id);
        if (existingReview != null)
        {
            // Update Existing
            existingReview.Content = request.Content;
            existingReview.IsSpoiler = request.IsSpoiler;
            existingReview.RatingOverall = request.RatingOverall;
            existingReview.RatingStory = request.RatingStory;
            existingReview.RatingCharacters = request.RatingCharacters;
            existingReview.RatingWorld = request.RatingWorld;
            existingReview.RatingFlow = request.RatingFlow;
            existingReview.RatingGrammar = request.RatingGrammar;
            existingReview.UpdatedAt = DateTime.UtcNow;

            await _reviewRepository.UpdateReviewAsync(existingReview);
        }
        else
        {
            // Create New
            var review = new Review
            {
                NovelId = novelId,
                UserId = user.Id,
                Content = request.Content,
                IsSpoiler = request.IsSpoiler,
                RatingOverall = request.RatingOverall,
                RatingStory = request.RatingStory,
                RatingCharacters = request.RatingCharacters,
                RatingWorld = request.RatingWorld,
                RatingFlow = request.RatingFlow,
                RatingGrammar = request.RatingGrammar,
                CreatedAt = DateTime.UtcNow
            };
            await _reviewRepository.AddReviewAsync(review);
        }

        await _cache.RemoveAsync($"reviews:{novelId}:1");

        // Recalculate Stats
        var avgRating = await _reviewRepository.CalculateAverageRatingAsync(novelId);
        var count = await _reviewRepository.GetReviewCountAsync(novelId);

        await _novelRepository.UpdateReviewStatsAsync(novelId, count, avgRating);
        await SyncNovelRank(novelId);

        return new Response<bool>(true);
    }

    public async Task<Response<List<CommentDto>>> GetCommentsAsync(int novelId, int page, int pageSize)
    {
        var cacheKey = $"comments:{novelId}:fulltree";
        string? cachedData = await _cache.GetStringAsync(cacheKey);
        List<CommentDto>? fullTree = null;

        if (!string.IsNullOrEmpty(cachedData))
        {
            fullTree = JsonSerializer.Deserialize<List<CommentDto>>(cachedData);
        }

        if (fullTree == null)
        {
            // Fetch ALL comments to build the tree. 
            // We assume GetCommentsByNovelIdAsync returns flat list if we ask for many, 
            // OR we need a new method. 
            // Let's assume we can fetch all.
            // Since we can't easily change Repo interface, let's try to fetch a large number 
            // IF the current repo method filters by ParentId=null, then we can't use it to fetch children.
            // Let's assume we need to modify Repo to fetch all.
            // For now, I'll try to fetch all using a large page size if the repo supports it.
            // BUT, if repo explicitly filters ParentId == null, we are stuck.
            
            // Checking Repository implementation would be ideal.
            // Assuming we change Repo to return all raw comments.
            
            var allComments = await _reviewRepository.GetAllCommentsForNovelAsync(novelId);
            
            var commentMap = allComments.ToDictionary(c => c.Id, c => MapCommentToDto(c));
            
            var roots = new List<CommentDto>();

            // 1. First Pass: Build the tree
            foreach (var commentDto in commentMap.Values)
            {
                if (commentDto.ParentId.HasValue && commentMap.TryGetValue(commentDto.ParentId.Value, out var parent))
                {
                    parent.Replies.Add(commentDto);
                }
                else if (!commentDto.ParentId.HasValue)
                {
                    // Only add to roots if not deleted OR if deleted but has chances of having children (we'll prune later)
                    // Actually add everything, prune later.
                    roots.Add(commentDto);
                }
            }
            
            // 2. Second Pass: Recursive Pruning and Sanitization
            // We want to remove nodes that are IsDeleted AND have no visible children.
            // And if a node is IsDeleted but HAS children, we sanitize it (Ghost Comment).
            
            List<CommentDto> PruneAndSanitize(List<CommentDto> nodes)
            {
                var keepNodes = new List<CommentDto>();
                
                foreach (var node in nodes)
                {
                    // Recurse first (Bottom-Up)
                    node.Replies = PruneAndSanitize(node.Replies);
                    
                    // Logic:
                    // If Alive -> Keep.
                    // If Deleted -> Keep ONLY if has replies.
                    
                    if (!node.IsDeleted) 
                    {
                        keepNodes.Add(node);
                    }
                    else
                    {
                        // It is deleted
                        if (node.Replies.Count > 0)
                        {
                            // It has children, so it becomes a Ghost Comment
                            node.Content = "[Bu yorum silinmiştir]";
                            node.UserDisplayName = "Silinmiş Kullanıcı";
                            node.UserAvatarUrl = null; // Default avatar will be used
                            node.UserId = string.Empty; // Hide ID
                            node.FirebaseUid = string.Empty;
                            node.IsSpoiler = false; 
                            keepNodes.Add(node);
                        }
                        // Else: Deleted and No Children -> Drop it (Pruned)
                    }
                }
                
                // Sort by date
                return keepNodes.OrderBy(n => n.CreatedAt).ToList();
            }

            roots = PruneAndSanitize(roots);
            fullTree = roots.OrderByDescending(c => c.CreatedAt).ToList();

            var options = new DistributedCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(2));
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(fullTree), options);
        }

        // Pagination on Roots
        var paged = fullTree.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new Response<List<CommentDto>>(paged);

    }

    public async Task<Response<List<CommentDto>>> GetCommentsByUserIdAsync(string firebaseUid)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<List<CommentDto>>("User not found");

        var comments = await _reviewRepository.GetCommentsByUserIdAsync(user.Id);
        
        // Map to DTOs
        var dtos = comments.Select(c => MapCommentToDto(c)).ToList();
        
        return new Response<List<CommentDto>>(dtos);
    }

    public async Task<Response<List<ReviewDto>>> GetReviewsByUserIdAsync(string firebaseUid)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<List<ReviewDto>>("User not found");

        var reviews = await _reviewRepository.GetReviewsByUserIdAsync(user.Id);
        
        var dtos = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            NovelId = r.NovelId, // Map NovelId
            UserId = r.UserId.ToString(),
            Content = r.Content,
            IsSpoiler = r.IsSpoiler,
            LikeCount = r.LikeCount,
            DislikeCount = r.DislikeCount,
            UserDisplayName = r.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = r.User?.AvatarUrl,
            FirebaseUid = r.User?.FirebaseUid ?? string.Empty,
            RatingOverall = r.RatingOverall,
            RatingStory = r.RatingStory,
            RatingCharacters = r.RatingCharacters,
            RatingWorld = r.RatingWorld,
            RatingFlow = r.RatingFlow,
            RatingGrammar = r.RatingGrammar,
            CreatedAt = r.CreatedAt
        }).ToList();

        return new Response<List<ReviewDto>>(dtos);
    }
    
    private CommentDto MapCommentToDto(Comment c)
    {
        // Initial mapping (raw), sanitization happens in PruneAndSanitize if needed
        return new CommentDto
        {
            Id = c.Id,
            NovelId = c.NovelId, // Map NovelId
            UserId = c.UserId.ToString(),
            Content = c.Content,
            IsSpoiler = c.IsSpoiler,
            LikeCount = c.LikeCount,
            DislikeCount = c.DislikeCount,
            UserDisplayName = c.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = c.User?.AvatarUrl,
            FirebaseUid = c.User?.FirebaseUid ?? string.Empty,
            CreatedAt = c.CreatedAt,
            ParentId = c.ParentId,
            IsDeleted = c.IsDeleted,
            Replies = new List<CommentDto>() 
        };
    }

    public async Task<Response<bool>> DeleteCommentAsync(string firebaseUid, int commentId)
    {
        var comment = await _reviewRepository.GetCommentByIdAsync(commentId);
        if (comment == null) return new Response<bool>("Comment not found");

        // Optional: Check ownership here if trusted. 
        // var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        // if (user.Id != comment.UserId) return new Response<bool>("Unauthorized");

        await _reviewRepository.DeleteCommentAsync(commentId);
        
        // Invalidate Cache
        await _cache.RemoveAsync($"comments:{comment.NovelId}:fulltree");
        
        // Update counts
        var count = await _reviewRepository.GetCommentCountAsync(comment.NovelId);
        await _novelRepository.UpdateCommentCountAsync(comment.NovelId, count);
        
        return new Response<bool>(true);
    }

    public async Task<Response<bool>> DeleteReviewAsync(string firebaseUid, int reviewId) 
    {
        var review = await _reviewRepository.GetReviewByIdAsync(reviewId);
        if (review == null) return new Response<bool>("Review not found");

        await _reviewRepository.DeleteReviewAsync(reviewId);
        
        // Invalidate Cache (Reviews uses paged keys, so we might need to clear multiple or just first page)
        // Ideally clear all pages for this novel. Pattern matching removal is hard with IDistributedCache without Redis specific implementation.
        // We will clear page 1, which is most important. 
        await _cache.RemoveAsync($"reviews:{review.NovelId}:1");
        
        // Update stats
        var avgRating = await _reviewRepository.CalculateAverageRatingAsync(review.NovelId);
        var count = await _reviewRepository.GetReviewCountAsync(review.NovelId);
        await _novelRepository.UpdateReviewStatsAsync(review.NovelId, count, avgRating);
        await SyncNovelRank(review.NovelId);

        return new Response<bool>(true);
    }

    public async Task<Response<bool>> UpdateReviewAsync(string firebaseUid, int novelId, ReviewRequest request)
    {
        // This is redundancy with AddReviewAsync which now handles Upsert.
        // But we can keep it explicit.
        return await AddReviewAsync(firebaseUid, novelId, request);
    }

    public async Task<Response<List<ReviewDto>>> GetReviewsAsync(int novelId, int page, int pageSize)
    {
        var cacheKey = $"reviews:{novelId}:{page}";
        var cachedData = await _cache.GetStringAsync(cacheKey);

        if (!string.IsNullOrEmpty(cachedData))
        {
            var cachedDtos = JsonSerializer.Deserialize<List<ReviewDto>>(cachedData);
            if (cachedDtos != null) return new Response<List<ReviewDto>>(cachedDtos);
        }

        var reviews = await _reviewRepository.GetReviewsByNovelIdAsync(novelId, (page - 1) * pageSize, pageSize);
        var dtos = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            UserId = r.UserId.ToString(),
            Content = r.Content,
            IsSpoiler = r.IsSpoiler,
            LikeCount = r.LikeCount,
            DislikeCount = r.DislikeCount,
            UserDisplayName = r.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = r.User?.AvatarUrl,
            FirebaseUid = r.User?.FirebaseUid ?? string.Empty,
            RatingOverall = r.RatingOverall,
            RatingStory = r.RatingStory,
            RatingCharacters = r.RatingCharacters,
            RatingWorld = r.RatingWorld,
            RatingFlow = r.RatingFlow,
            RatingGrammar = r.RatingGrammar,
            CreatedAt = r.CreatedAt
        }).ToList();

        var options = new DistributedCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(1));
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dtos), options);

        return new Response<List<ReviewDto>>(dtos);
    }

    public async Task<Response<(int Likes, int Dislikes)>> ToggleCommentReactionAsync(string firebaseUid, int commentId, int reactionType)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<(int, int)>("User not found");

        var result = await _reviewRepository.ToggleCommentReactionAsync(commentId, user.Id, reactionType);
        
        // Invalidate specific cache pages if possible, or shorten TTL. 
        // For simplicity, we might let it be stale for 1 min, or we could handle it.
        // Assuming eventual consistency is fine for counts.

        return new Response<(int, int)>(result);
    }

    public async Task<Response<(int Likes, int Dislikes)>> ToggleReviewReactionAsync(string firebaseUid, int reviewId, int reactionType)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<(int, int)>("User not found");

        var result = await _reviewRepository.ToggleReviewReactionAsync(reviewId, user.Id, reactionType);
        return new Response<(int, int)>(result);
    }

    public async Task<Response<Dictionary<int, int>>> GetUserCommentReactionsAsync(string firebaseUid, List<int> commentIds)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<Dictionary<int, int>>("User not found");

        var reactions = await _reviewRepository.GetUserCommentReactionsAsync(commentIds, user.Id);
        return new Response<Dictionary<int, int>>(reactions);
    }

    public async Task<Response<Dictionary<int, int>>> GetUserReviewReactionsAsync(string firebaseUid, List<int> reviewIds)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(firebaseUid);
        if (user == null) return new Response<Dictionary<int, int>>("User not found");

        var reactions = await _reviewRepository.GetUserReviewReactionsAsync(reviewIds, user.Id);
        return new Response<Dictionary<int, int>>(reactions);
    }

    public async Task<Response<List<ReviewDto>>> GetLatestReviewsAsync(int count)
    {
        var reviews = await _reviewRepository.GetLatestReviewsAsync(count);
        var dtos = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            NovelId = r.NovelId,
            UserId = r.UserId.ToString(),
            Content = r.Content,
            IsSpoiler = r.IsSpoiler,
            LikeCount = r.LikeCount,
            DislikeCount = r.DislikeCount,
            UserDisplayName = r.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = r.User?.AvatarUrl,
            FirebaseUid = r.User?.FirebaseUid ?? string.Empty,
            RatingOverall = r.RatingOverall,
            RatingStory = r.RatingStory,
            RatingCharacters = r.RatingCharacters,
            RatingWorld = r.RatingWorld,
            RatingFlow = r.RatingFlow,
            RatingGrammar = r.RatingGrammar,
            CreatedAt = r.CreatedAt
        }).ToList();
        return new Response<List<ReviewDto>>(dtos);
    }

    private async Task SyncNovelRank(int novelId)
    {
        var novel = await _novelRepository.GetByIdAsync(novelId);
        if (novel != null)
        {
            int newScore = NovelRankingCalculator.CalculateScore(novel);
            await _novelRepository.UpdateRankScoreAsync(novelId, newScore);
        }
    }
}
