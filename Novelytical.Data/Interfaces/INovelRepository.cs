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
}
