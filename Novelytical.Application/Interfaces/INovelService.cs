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
        string? sortOrder = null,
        int pageNumber = 1,
        int pageSize = 9);
    
    Task<Response<NovelDetailDto>> GetNovelByIdAsync(int id);
}
