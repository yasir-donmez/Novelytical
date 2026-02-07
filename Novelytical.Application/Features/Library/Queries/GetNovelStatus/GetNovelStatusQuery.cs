using MediatR;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Library.Queries.GetNovelStatus;

public class GetNovelStatusQuery : IRequest<Response<int?>>
{
    public required string FirebaseUid { get; set; }
    public int NovelId { get; set; }
}
