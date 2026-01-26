using Novelytical.Data.Entities; 
using Novelytical.Data;

namespace Novelytical.Data.Interfaces;

/// <summary>
/// Repository interface for Novel data access
/// </summary>
public interface INovelRepository
{
    /// <summary>
    /// Get optimized query for Novels with AsNoTracking + AsSplitQuery
    /// </summary>
    IQueryable<Novel> GetOptimizedQuery();
    
    Task<int> GetCountAsync();
    Task<Novel?> GetByIdAsync(int id);
    Task<Novel?> GetBySlugAsync(string slug);
    Task<List<Tag>> GetAllTagsAsync();

    // Stats updates
    Task IncrementSiteViewAsync(int id);
    Task UpdateCommentCountAsync(int id, int count);
    Task UpdateLibraryCountAsync(int id, int count);
    Task UpdateReviewStatsAsync(int id, int count, double? avgRating, double? rStory = null, double? rChar = null, double? rWorld = null, double? rFlow = null, double? rGrammar = null);
    Task UpdateRankScoreAsync(int id, int score);
}
