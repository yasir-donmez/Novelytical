using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Novels.Queries.GetNovels;

public class GetNovelsQuery : IRequest<PagedResponse<NovelListDto>>
{
    public string? SearchString { get; set; }
    public List<string>? Tags { get; set; }
    public string? SortOrder { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 9;
    public int? MinChapters { get; set; }
    public int? MaxChapters { get; set; }
    public decimal? MinRating { get; set; }
    public decimal? MaxRating { get; set; }
}
