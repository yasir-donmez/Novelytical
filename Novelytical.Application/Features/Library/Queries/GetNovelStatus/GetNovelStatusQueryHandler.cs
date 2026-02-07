using MediatR;
using Microsoft.EntityFrameworkCore;
using Novelytical.Application.Wrappers;
using Novelytical.Data;

namespace Novelytical.Application.Features.Library.Queries.GetNovelStatus;

public class GetNovelStatusQueryHandler : IRequestHandler<GetNovelStatusQuery, Response<int?>>
{
    private readonly AppDbContext _context;

    public GetNovelStatusQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Response<int?>> Handle(GetNovelStatusQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == request.FirebaseUid, cancellationToken);
            if (user == null) return new Response<int?>(null);

            var entry = await _context.UserLibraries
                .FirstOrDefaultAsync(l => l.UserId == user.Id && l.NovelId == request.NovelId, cancellationToken);

            return new Response<int?>(entry != null ? entry.Status : null);
        }
        catch
        {
            return new Response<int?>(null);
        }
    }
}
