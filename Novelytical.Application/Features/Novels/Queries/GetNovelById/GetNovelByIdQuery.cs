using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Novels.Queries.GetNovelById;

public class GetNovelByIdQuery : IRequest<Response<NovelDetailDto>>
{
    public int Id { get; set; }

    public GetNovelByIdQuery(int id)
    {
        Id = id;
    }
}
