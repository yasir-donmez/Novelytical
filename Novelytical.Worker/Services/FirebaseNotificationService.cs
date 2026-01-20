using FirebaseAdmin;
using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using Microsoft.Extensions.Logging;
using Novelytical.Data;
using System.Text.Encodings.Web;

namespace Novelytical.Services
{
    public class FirebaseNotificationService
    {
        private readonly FirestoreDb _firestoreDb;
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
            }
        }

        public async Task NotifyAuthorFollowersAsync(string authorName, string title, string body, string sourceId, string sourceLink, string type, string senderName, string senderImage)
        {
            if (_firestoreDb == null) return;

            try
            {
                // 1. Find followers
                var followersRef = _firestoreDb.Collection("author_follows");
                // Note: authorName stored in Firestore should be normalized/consistent with query.
                // Assuming client stores it decoded.
                var query = followersRef.WhereEqualTo("authorName", authorName);
                var snapshot = await query.GetSnapshotAsync();

                if (snapshot.Count == 0) return;

                _logger.LogInformation("📢 Sending notification to {Count} followers of {Author}", snapshot.Count, authorName);

                // 2. Batch write notifications
                var batch = _firestoreDb.StartBatch();
                var notificationsRef = _firestoreDb.Collection("notifications");

                foreach (var doc in snapshot.Documents)
                {
                    if (doc.TryGetValue("userId", out string userId))
                    {
                        var notifData = new
                        {
                            recipientId = userId,
                            type = type, // 'system' or 'author_update'
                            content = body,
                            sourceId = sourceId,
                            sourceLink = sourceLink,
                            senderId = "system",
                            senderName = senderName,
                            senderImage = senderImage,
                            isRead = false,
                            createdAt = FieldValue.ServerTimestamp
                        };

                        var newDoc = notificationsRef.Document();
                        batch.Create(newDoc, notifData);
                    }
                }

                await batch.CommitAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending author notifications");
            }
        }

        public async Task NotifyNovelUpdateAsync(string authorName, string novelTitle, string novelId, string novelCover, string updateType)
        {
            string message = "";
            string type = "system";
            string link = $"/kitap/{novelId}";

            if (updateType == "new_chapter")
            {
                message = $"{novelTitle} serisinin yeni bölümü yayınlandı!";
            }
            else if (updateType == "new_novel")
            {
                message = $"{authorName}, yeni bir seri yayınladı: {novelTitle}";
            }
            else
            {
                return;
            }

            await NotifyAuthorFollowersAsync(
                authorName, 
                "Yeni Güncelleme", 
                message, 
                novelId, 
                link, 
                type, 
                authorName, 
                novelCover
            );
        }
    }
}
