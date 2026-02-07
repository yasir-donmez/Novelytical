using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Library.Queries.GetUserLibrary;

public class GetUserLibraryQuery : IRequest<Response<List<UserLibraryDto>>>
{
    public required string TargetUserId { get; set; }
    public string? RequesterUserId { get; set; }
}
