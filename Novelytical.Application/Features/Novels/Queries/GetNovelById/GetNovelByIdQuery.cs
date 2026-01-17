using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Novels.Queries.GetNovelById;

public class GetNovelByIdQuery : IRequest<Response<NovelDetailDto>>
{
    public string IdOrSlug { get; set; }

    public GetNovelByIdQuery(string idOrSlug)
    {
        IdOrSlug = idOrSlug;
    }
}
