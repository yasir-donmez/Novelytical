using Microsoft.EntityFrameworkCore;
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

}
