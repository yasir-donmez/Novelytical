using Microsoft.EntityFrameworkCore;
using Novelytical.Data.Interfaces;

namespace Novelytical.Data.Repositories;

public class LibraryRepository : ILibraryRepository
{
    private readonly AppDbContext _context;

    public LibraryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserLibrary?> GetUserLibraryItemAsync(Guid userId, int novelId)
    {
        return await _context.UserLibraries
            .Include(ul => ul.Novel)
            .FirstOrDefaultAsync(ul => ul.UserId == userId && ul.NovelId == novelId);
    }

    public async Task<IEnumerable<UserLibrary>> GetUserLibraryAsync(Guid userId)
    {
        return await _context.UserLibraries
            .Include(ul => ul.Novel)
            .Where(ul => ul.UserId == userId)
            .ToListAsync();
    }

    public async Task AddToLibraryAsync(UserLibrary userLibrary)
    {
        await _context.UserLibraries.AddAsync(userLibrary);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateLibraryItemAsync(UserLibrary userLibrary)
    {
        _context.UserLibraries.Update(userLibrary);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveFromLibraryAsync(UserLibrary userLibrary)
    {
        _context.UserLibraries.Remove(userLibrary);
        await _context.SaveChangesAsync();
    }
}
