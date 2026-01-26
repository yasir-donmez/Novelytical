using Microsoft.EntityFrameworkCore;
using Novelytical.Data.Entities;
using Novelytical.Data;
using Novelytical.Data.Interfaces;

namespace Novelytical.Data.Repositories;

/// <summary>
/// Repository implementation for Novel with performance optimizations
/// </summary>
public class NovelRepository : INovelRepository
{
    private readonly AppDbContext _context;

    public NovelRepository(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns optimized IQueryable with AsNoTracking + AsSplitQuery for best performance
    /// </summary>
    public IQueryable<Novel> GetOptimizedQuery()
    {
        return _context.Novels
            .AsNoTracking()           // 🚀 Read-only, no change tracking
            .Include(n => n.NovelTags)
            .ThenInclude(nt => nt.Tag);
    }

    public async Task<int> GetCountAsync()
    {
        return await _context.Novels.CountAsync();
    }

    public async Task<Novel?> GetByIdAsync(int id)
    {
        return await _context.Novels
            .AsNoTracking()
            .AsSplitQuery()
            .Include(n => n.NovelTags)
            .ThenInclude(nt => nt.Tag)
            .FirstOrDefaultAsync(n => n.Id == id);
    }

    public async Task<Novel?> GetBySlugAsync(string slug)
    {
        return await _context.Novels
            .AsNoTracking()
            .AsSplitQuery()
            .Include(n => n.NovelTags)
            .ThenInclude(nt => nt.Tag)
            .FirstOrDefaultAsync(n => n.Slug == slug);
    }

    public async Task<List<Tag>> GetAllTagsAsync()
    {
        return await _context.Tags
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    public async Task IncrementSiteViewAsync(int id)
    {
        // Execute direct SQL for atomic increment performance
        await _context.Database.ExecuteSqlInterpolatedAsync($"UPDATE \"Novels\" SET \"SiteViewCount\" = \"SiteViewCount\" + 1 WHERE \"Id\" = {id}");

    }

    public async Task UpdateCommentCountAsync(int id, int count)
    {
        await _context.Database.ExecuteSqlInterpolatedAsync($"UPDATE \"Novels\" SET \"CommentCount\" = {count} WHERE \"Id\" = {id}");
    }

    public async Task UpdateReviewStatsAsync(int id, int count, double? avgRating, double? rStory = null, double? rChar = null, double? rWorld = null, double? rFlow = null, double? rGrammar = null)
    {
        if (avgRating.HasValue)
        {
            var story = rStory ?? 0;
            var chars = rChar ?? 0;
            var world = rWorld ?? 0;
            var flow = rFlow ?? 0;
            var grammar = rGrammar ?? 0;

            await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE ""Novels"" 
                SET ""ReviewCount"" = {count}, 
                    ""Rating"" = {avgRating.Value},
                    ""RatingStory"" = {story},
                    ""RatingCharacters"" = {chars},
                    ""RatingWorld"" = {world},
                    ""RatingFlow"" = {flow},
                    ""RatingGrammar"" = {grammar}
                WHERE ""Id"" = {id}");
        }
        else
        {
            await _context.Database.ExecuteSqlInterpolatedAsync($"UPDATE \"Novels\" SET \"ReviewCount\" = {count} WHERE \"Id\" = {id}");
        }
    }

    public async Task UpdateLibraryCountAsync(int id, int count)
    {
        await _context.Database.ExecuteSqlInterpolatedAsync($"UPDATE \"Novels\" SET \"LibraryCount\" = {count} WHERE \"Id\" = {id}");
    }

    public async Task UpdateRankScoreAsync(int id, int score)
    {
        await _context.Database.ExecuteSqlInterpolatedAsync($"UPDATE \"Novels\" SET \"TotalRankScore\" = {score} WHERE \"Id\" = {id}");
    }
}
