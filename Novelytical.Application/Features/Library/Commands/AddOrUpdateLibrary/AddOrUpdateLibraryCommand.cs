using MediatR;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Features.Library.Commands.AddOrUpdateLibrary;

public class AddOrUpdateLibraryCommand : IRequest<Response<bool>>
{
    public required string FirebaseUid { get; set; }
    public int NovelId { get; set; }
    public int Status { get; set; }
    public int? CurrentChapter { get; set; }
}
