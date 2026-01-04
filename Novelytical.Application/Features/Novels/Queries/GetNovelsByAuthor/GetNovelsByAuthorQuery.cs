using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Novels.Queries.GetNovelsByAuthor;

public class GetNovelsByAuthorQuery : IRequest<Response<List<NovelListDto>>>
{
    public string Author { get; set; } = string.Empty;
    public int ExcludeId { get; set; }
    public int PageSize { get; set; } = 6;
}
