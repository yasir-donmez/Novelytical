using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Interfaces;

/// <summary>
/// Service interface for Novel business logic
/// </summary>
public interface INovelService
{
    Task<PagedResponse<NovelListDto>> GetNovelsAsync(
        string? searchString = null,
        List<string>? tags = null,
        string? sortOrder = null,
        int pageNumber = 1,
        int pageSize = 9,
        int? minChapters = null,
        int? maxChapters = null,
        decimal? minRating = null,
        decimal? maxRating = null);
    
    Task<Response<NovelDetailDto>> GetNovelByIdAsync(int id);
    
    Task<Response<List<NovelListDto>>> GetNovelsByAuthorAsync(string author, int excludeId, int pageSize);
    
    Task<Response<List<NovelListDto>>> GetSimilarNovelsAsync(int novelId, int limit);
    
    Task<Response<List<string>>> GetAllTagsAsync();
}
