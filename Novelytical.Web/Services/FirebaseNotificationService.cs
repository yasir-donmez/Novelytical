using FirebaseAdmin;
using Google.Cloud.Firestore;
using Novelytical.Application.Interfaces;

namespace Novelytical.Web.Services;

public class FirebaseNotificationService : INotificationService
{
    private readonly FirestoreDb? _firestoreDb;
    private readonly ILogger<FirebaseNotificationService> _logger;

    public FirebaseNotificationService(ILogger<FirebaseNotificationService> logger)
    {
        _logger = logger;
        try
        {
            _firestoreDb = FirestoreDb.Create(FirebaseApp.DefaultInstance.Options.ProjectId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize FirestoreDb");
            // Consider throwing or handling gracefully if Firestore is critical
        }
    }

    public async Task NotifyReviewCommentAsync(string recipientFirebaseUid, string senderName, string senderImage, string reviewId, string novelId, string commentContent)
    {
        if (_firestoreDb == null) return;

        // 1. Check Settings
        var shouldSend = await CheckUserSetting(recipientFirebaseUid, "pushReplies");
        if (!shouldSend) return;

        // 2. Create Notification
        var notificationsRef = _firestoreDb.Collection("notifications");
        var notifData = new
        {
            recipientId = recipientFirebaseUid,
            type = "reply", // Matches frontend Type
            content = $"{senderName} incelemenize yorum yaptı: \"{Truncate(commentContent, 50)}\"",
            sourceId = reviewId,
            sourceLink = $"/kitap/{novelId}", // Redirect to Novel Page (Review is likely there)
            senderId = "system", // Or use senderUid if we had it, but standardizing on system or user
            senderName = senderName,
            senderImage = senderImage,
            isRead = false,
            createdAt = FieldValue.ServerTimestamp
        };

        await notificationsRef.AddAsync(notifData);
    }

    public async Task NotifyReviewLikeAsync(string recipientFirebaseUid, string senderName, string senderImage, string reviewId, string novelId)
    {
        if (_firestoreDb == null) return;

        // 1. Check Settings
        // Assuming "Likely Review" falls under "Replies" or interaction bucket. 
        // Or if we had "pushLikes". For now using pushReplies to be safe/consistent with CommentService.
        var shouldSend = await CheckUserSetting(recipientFirebaseUid, "pushReplies");
        if (!shouldSend) return;

        var notificationsRef = _firestoreDb.Collection("notifications");
        var notifData = new
        {
            recipientId = recipientFirebaseUid,
            type = "like", 
            content = $"{senderName} incelemenizi beğendi.",
            sourceId = reviewId,
            sourceLink = $"/kitap/{novelId}", 
            senderId = "system",
            senderName = senderName,
            senderImage = senderImage,
            isRead = false,
            createdAt = FieldValue.ServerTimestamp
        };

        await notificationsRef.AddAsync(notifData);
    }

    public async Task NotifyCommentLikeAsync(string recipientFirebaseUid, string senderName, string senderImage, string commentId, string novelId)
    {
        if (_firestoreDb == null) return;

        var shouldSend = await CheckUserSetting(recipientFirebaseUid, "pushReplies"); // Assuming likes fall under interactions
        if (!shouldSend) return;

        var notificationsRef = _firestoreDb.Collection("notifications");
        var notifData = new
        {
            recipientId = recipientFirebaseUid,
            type = "like", 
            content = $"{senderName} yorumunuzu beğendi.",
            sourceId = commentId,
            sourceLink = $"/kitap/{novelId}", 
            senderId = "system",
            senderName = senderName,
            senderImage = senderImage,
            isRead = false,
            createdAt = FieldValue.ServerTimestamp
        };

        await notificationsRef.AddAsync(notifData);
    }

    public async Task NotifyFollowAsync(string recipientFirebaseUid, string followerName, string followerImage, string followerId)
    {
        if (_firestoreDb == null) return;

        var shouldSend = await CheckUserSetting(recipientFirebaseUid, "pushFollows");
        if (!shouldSend) return;

        var notificationsRef = _firestoreDb.Collection("notifications");
        // Unique ID to prevent duplicate notifications for same follow action
        var notifId = $"follow_{followerId}_{recipientFirebaseUid}";
        var notifRef = notificationsRef.Document(notifId);

        var notifData = new
        {
            recipientId = recipientFirebaseUid,
            type = "follow",
            content = $"{followerName} sizi takip etti.",
            sourceId = followerId,
            sourceLink = $"/profil/{followerId}",
            senderId = followerId,
            senderName = followerName,
            senderImage = followerImage,
            isRead = false,
            createdAt = FieldValue.ServerTimestamp
        };

        await notifRef.SetAsync(notifData);
    }

    private async Task<bool> CheckUserSetting(string uid, string settingKey)
    {
        try
        {
            var userDoc = await _firestoreDb.Collection("users").Document(uid).GetSnapshotAsync();
            if (!userDoc.Exists) return true; // Default allow if user has no profile doc yet?

            if (userDoc.TryGetValue("notificationSettings", out Dictionary<string, object> settings))
            {
                if (settings.TryGetValue(settingKey, out var val) && val is bool b)
                {
                    return b;
                }
            }
            return true; // Default to true if setting missing
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking notification settings for {Uid}", uid);
            return true; // Fail open (send notification) on error? Or fail closed? Usually open for engagement.
        }
    }

    private string Truncate(string str, int length)
    {
        if (string.IsNullOrEmpty(str)) return str;
        return str.Length <= length ? str : str.Substring(0, length) + "...";
    }
}
