using MediatR;
using Google.Cloud.Firestore;
using Novelytical.Application.Wrappers;
using Novelytical.Application.Interfaces;
using Novelytical.Data;
using Microsoft.EntityFrameworkCore;

namespace Novelytical.Application.Features.Users.Commands.FollowUser;

public class FollowUserCommand : IRequest<Response<bool>>
{
    public string FollowerUid { get; set; }
    public string FollowingUid { get; set; }
}

public class FollowUserCommandHandler : IRequestHandler<FollowUserCommand, Response<bool>>
{
    private readonly FirestoreDb _firestoreDb;
    private readonly INotificationService _notificationService;
    private readonly AppDbContext _context;

    public FollowUserCommandHandler(FirestoreDb firestoreDb, INotificationService notificationService, AppDbContext context)
    {
        _firestoreDb = firestoreDb;
        _notificationService = notificationService;
        _context = context;
    }

    public async Task<Response<bool>> Handle(FollowUserCommand request, CancellationToken cancellationToken)
    {
        if (request.FollowerUid == request.FollowingUid) return new Response<bool>("Kendinizi takip edemezsiniz.");

        // 1. Check for Ban (Firestore)
        var followerRef = _firestoreDb.Collection("users").Document(request.FollowerUid);
        var followerSnap = await followerRef.GetSnapshotAsync(cancellationToken);

        if (followerSnap.Exists && followerSnap.TryGetValue("followBanUntil", out Timestamp banUntil))
        {
            if (banUntil.ToDateTime() > DateTime.UtcNow)
                return new Response<bool>($"Takip işlemleriniz {banUntil.ToDateTime()} tarihine kadar kısıtlanmıştır.");
        }

        // 2. Add Follow Record (Firestore)
        var docId = $"{request.FollowerUid}_{request.FollowingUid}";
        var refDoc = _firestoreDb.Collection("follows").Document(docId);

        await refDoc.SetAsync(new
        {
            followerId = request.FollowerUid,
            followingId = request.FollowingUid,
            createdAt = FieldValue.ServerTimestamp
        }, cancellationToken: cancellationToken);

        // 3. Send Notification
        // Get Follower Info for notification
        string followerName = "Bir kullanıcı";
        string followerImage = "";
        
        if (followerSnap.Exists)
        {
             followerName = followerSnap.GetValue<string>("displayName") ?? followerSnap.GetValue<string>("username") ?? "Bir kullanıcı";
             followerSnap.TryGetValue("photoURL", out followerImage);
        }

        await _notificationService.NotifyFollowAsync(request.FollowingUid, followerName, followerImage, request.FollowerUid);

        return new Response<bool>(true);
    }
}
