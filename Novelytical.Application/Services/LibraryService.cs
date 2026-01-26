using Microsoft.EntityFrameworkCore;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;

#nullable disable

namespace Novelytical.Application.Services;

public class LibraryService : ILibraryService
{
    private readonly AppDbContext _context;

    public LibraryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Response<bool>> AddOrUpdateAsync(string firebaseUid, int novelId, int status, int? currentChapter = null)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
            if (user == null) return new Response<bool>("Kullanıcı bulunamadı.");

            var libraryEntry = await _context.UserLibraries
                .FirstOrDefaultAsync(l => l.UserId == user.Id && l.NovelId == novelId);

            if (libraryEntry == null)
            {
                libraryEntry = new UserLibrary
                {
                    UserId = user.Id,
                    NovelId = novelId,
                    Status = status,
                    CurrentChapter = currentChapter,
                    AddedAt = DateTime.UtcNow
                };
                _context.UserLibraries.Add(libraryEntry);
            }
            else
            {
                libraryEntry.Status = status;
                if (currentChapter.HasValue) 
                {
                    libraryEntry.CurrentChapter = currentChapter.Value;
                }
                libraryEntry.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return new Response<bool>(true);
        }
        catch (Exception ex)
        {
            return new Response<bool>($"Hata: {ex.Message}");
        }
    }

    public async Task<Response<List<UserLibraryDto>>> GetUserLibraryAsync(string firebaseUid)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
            if (user == null) return new Response<List<UserLibraryDto>>("Kullanıcı bulunamadı.");

            var library = await _context.UserLibraries
                .Where(l => l.UserId == user.Id && l.Novel != null)
                .Include(l => l.Novel)
                .Select(l => new UserLibraryDto
                {
                    NovelId = l.NovelId,
                    NovelTitle = l.Novel.Title ?? "Bilinmeyen Başlık",
                    NovelSlug = l.Novel.Slug ?? "unknown-slug",
                    CoverImage = l.Novel.CoverUrl,
                    Status = l.Status,
                    CurrentChapter = l.CurrentChapter,
                    AddedAt = l.AddedAt
                })
                .OrderByDescending(l => l.AddedAt)
                .ToListAsync();

            return new Response<List<UserLibraryDto>>(library ?? new List<UserLibraryDto>());
        }
        catch (Exception ex)
        {
            return new Response<List<UserLibraryDto>>($"Hata: {ex.Message}");
        }
    }

    public async Task<Response<int?>> GetNovelStatusAsync(string firebaseUid, int novelId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
            if (user == null) return new Response<int?>(null);

            var entry = await _context.UserLibraries
                .FirstOrDefaultAsync(l => l.UserId == user.Id && l.NovelId == novelId);

            return new Response<int?>(entry != null ? entry.Status : null);
        }
        catch
        {
            return new Response<int?>(null);
        }
    }
}
