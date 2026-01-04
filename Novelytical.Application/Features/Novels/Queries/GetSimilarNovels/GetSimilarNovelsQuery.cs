using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Novels.Queries.GetSimilarNovels;

public class GetSimilarNovelsQuery : IRequest<Response<List<NovelListDto>>>
{
    public int NovelId { get; set; }
    public int Limit { get; set; } = 12;

    public GetSimilarNovelsQuery(int novelId, int limit)
    {
        NovelId = novelId;
        Limit = limit;
    }
}
