using MediatR;
using Microsoft.EntityFrameworkCore;
using Google.Cloud.Firestore;
using Novelytical.Application.Wrappers;
using Novelytical.Data;

namespace Novelytical.Application.Features.Users.Commands.DeleteAccount;

public class DeleteAccountCommand : IRequest<Response<bool>>
{
    public string Uid { get; set; }
}

public class DeleteAccountCommandHandler : IRequestHandler<DeleteAccountCommand, Response<bool>>
{
    private readonly AppDbContext _context;
    private readonly FirestoreDb _firestoreDb;

    public DeleteAccountCommandHandler(AppDbContext context, FirestoreDb firestoreDb)
    {
        _context = context;
        _firestoreDb = firestoreDb;
    }

    public async Task<Response<bool>> Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Delete from Postgres
            var user = await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == request.Uid, cancellationToken);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 2. Delete from Firestore
            // A. Delete User Profile
            var userDocRef = _firestoreDb.Collection("users").Document(request.Uid);
            await userDocRef.DeleteAsync(cancellationToken: cancellationToken);

            // B. Delete User Library Items (in 'libraries' collection)
            var libraryQuery = _firestoreDb.Collection("libraries").WhereEqualTo("userId", request.Uid);
            var librarySnap = await libraryQuery.GetSnapshotAsync(cancellationToken);
            foreach (var doc in librarySnap.Documents)
            {
                await doc.Reference.DeleteAsync(cancellationToken: cancellationToken);
            }

            // C. Delete Follows (Where user is follower or following)
            // Follower
            var followerQuery = _firestoreDb.Collection("follows").WhereEqualTo("followerId", request.Uid);
            var followerSnap = await followerQuery.GetSnapshotAsync(cancellationToken);
            foreach (var doc in followerSnap.Documents) await doc.Reference.DeleteAsync(cancellationToken: cancellationToken);

            // Following (Where people follow this user)
            var followingQuery = _firestoreDb.Collection("follows").WhereEqualTo("followingId", request.Uid);
            var followingSnap = await followingQuery.GetSnapshotAsync(cancellationToken);
            foreach (var doc in followingSnap.Documents) await doc.Reference.DeleteAsync(cancellationToken: cancellationToken);

            // D. Delete Notifications
            var notifQuery = _firestoreDb.Collection("notifications").WhereEqualTo("userId", request.Uid);
            var notifSnap = await notifQuery.GetSnapshotAsync(cancellationToken);
            foreach (var doc in notifSnap.Documents) await doc.Reference.DeleteAsync(cancellationToken: cancellationToken);

            // E. Delete Activities (Feed)
            var feedQuery = _firestoreDb.Collection("activities").WhereEqualTo("userId", request.Uid);
            var feedSnap = await feedQuery.GetSnapshotAsync(cancellationToken);
            foreach (var doc in feedSnap.Documents) await doc.Reference.DeleteAsync(cancellationToken: cancellationToken);

            return new Response<bool>(true, "Hesap başarıyla silindi ve veriler temizlendi.");
        }
        catch (Exception ex)
        {
            return new Response<bool>($"Hesap silinirken hata oluştu: {ex.Message}");
        }
    }
}
