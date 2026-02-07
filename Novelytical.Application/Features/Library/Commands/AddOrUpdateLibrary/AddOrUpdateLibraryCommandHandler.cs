using MediatR;
using Microsoft.EntityFrameworkCore;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Entities;
using System;

namespace Novelytical.Application.Features.Library.Commands.AddOrUpdateLibrary;

public class AddOrUpdateLibraryCommandHandler : IRequestHandler<AddOrUpdateLibraryCommand, Response<bool>>
{
    private readonly AppDbContext _context;

    public AddOrUpdateLibraryCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Response<bool>> Handle(AddOrUpdateLibraryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == request.FirebaseUid, cancellationToken);
            if (user == null) return new Response<bool>("Kullanıcı bulunamadı.");

            var libraryEntry = await _context.UserLibraries
                .FirstOrDefaultAsync(l => l.UserId == user.Id && l.NovelId == request.NovelId, cancellationToken);

            if (libraryEntry == null)
            {
                libraryEntry = new UserLibrary
                {
                    UserId = user.Id,
                    NovelId = request.NovelId,
                    Status = request.Status,
                    CurrentChapter = request.CurrentChapter,
                    AddedAt = DateTime.UtcNow
                };
                _context.UserLibraries.Add(libraryEntry);
            }
            else
            {
                libraryEntry.Status = request.Status;
                if (request.CurrentChapter.HasValue) 
                {
                    libraryEntry.CurrentChapter = request.CurrentChapter.Value;
                }
                libraryEntry.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return new Response<bool>(true);
        }
        catch (Exception ex)
        {
            return new Response<bool>($"Hata: {ex.Message}");
        }
    }
}
