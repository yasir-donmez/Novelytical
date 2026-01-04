using MediatR;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Novels.Queries.GetAllTags;

public class GetAllTagsQuery : IRequest<Response<List<string>>>
{
}
