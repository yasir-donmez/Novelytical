using Novelytical.Application.Wrappers;
using Novelytical.Data;

#nullable disable

namespace Novelytical.Application.Interfaces;

public interface ILibraryService
{
    Task<Response<bool>> AddOrUpdateAsync(string firebaseUid, int novelId, int status, int? currentChapter = null);
    Task<Response<List<UserLibraryDto>>> GetUserLibraryAsync(string firebaseUid);
    Task<Response<int?>> GetNovelStatusAsync(string firebaseUid, int novelId);
}

public class UserLibraryDto
{
    public int NovelId { get; set; }
    public string NovelTitle { get; set; }
    public string NovelSlug { get; set; }
    public string? CoverImage { get; set; }
    public int Status { get; set; }
    public int? CurrentChapter { get; set; }
    public DateTime AddedAt { get; set; }
}
