using FirebaseAdmin;
using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using Microsoft.Extensions.Logging;
using Novelytical.Data;
using System.Text.Encodings.Web;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Novelytical.Services
{
    public class FirebaseNotificationService
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
            }
        }

        public async Task NotifyAuthorFollowersAsync(string authorName, string title, string body, string sourceId, string sourceLink, string type, string senderName, string senderImage, string? requiredSettingKey = null)
        {
            if (_firestoreDb == null) return;

            try
            {
                // 1. Find followers
                var followersRef = _firestoreDb.Collection("author_follows");
                var query = followersRef.WhereEqualTo("authorName", authorName);
                var snapshot = await query.GetSnapshotAsync();

                if (snapshot.Count == 0) return;

                _logger.LogInformation("📢 Processing {Count} followers for {Author}", snapshot.Count, authorName);

                // 2. Prepare User Refs to check settings
                var followerUserIds = new List<string>();
                foreach (var doc in snapshot.Documents)
                {
                    if (doc.TryGetValue("userId", out string userId))
                    {
                        followerUserIds.Add(userId);
                    }
                }

                if (followerUserIds.Count == 0) return;

                // 3. Batch fetch User Docs (Firestore allows fetching multiple docs by ref)
                // Note: If list is huge, we should chunk it. For now assuming reasonable count or Firestore SDK handles chunks.
                var userRefs = followerUserIds.Select(uid => _firestoreDb.Collection("users").Document(uid)).ToArray();
                var userSnapshots = await _firestoreDb.GetAllSnapshotsAsync(userRefs);

                // 4. Filter targets based on Settings
                var validRecipients = new List<string>();

                foreach (var userDoc in userSnapshots)
                {
                    if (!userDoc.Exists) continue;

                    // If no key required, send it.
                    if (string.IsNullOrEmpty(requiredSettingKey)) 
                    {
                        validRecipients.Add(userDoc.Id);
                        continue;
                    }

                    // Check NotificationSettings
                    if (userDoc.TryGetValue("notificationSettings", out Dictionary<string, object> settings))
                    {
                        // key exists?
                        if (settings.TryGetValue(requiredSettingKey, out var settingVal))
                        {
                            // If explicit false, skip. (Default true is safer for engagement but preserving privacy is better)
                            // Assuming default is true if missing? Frontend 'settings' state has defaults.
                            // Here logic: If false, skip. Else send.
                            if (settingVal is bool b && b == false) continue;
                        }
                    }
                    else
                    {
                        // No settings object found -> Default to TRUE (Send)
                    }

                    validRecipients.Add(userDoc.Id);
                }

                if (validRecipients.Count == 0) return;

                _logger.LogInformation("📢 Sending to {Count} valid recipients after filtering settings", validRecipients.Count);

                // 5. Batch write notifications
                // Firestore batch limit is 500. Chunk if needed.
                var notificationsRef = _firestoreDb.Collection("notifications");
                var batches = validRecipients.Chunk(400); // Safe margin below 500

                foreach (var chunk in batches)
                {
                    var batch = _firestoreDb.StartBatch();
                    foreach (var recipientId in chunk)
                    {
                        var notifData = new
                        {
                            recipientId = recipientId,
                            type = type,
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
                    await batch.CommitAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending author notifications");
            }
        }
        public async Task NotifyUsersAsync(List<string> recipientIds, string title, string body, string sourceId, string sourceLink, string type, string senderName, string senderImage, string? requiredSettingKey = null)
        {
            if (_firestoreDb == null || recipientIds.Count == 0) return;

            try
            {
                _logger.LogInformation("📢 Processing {Count} recipients for notification: {Title}", recipientIds.Count, title);

                // 1. Batch fetch User Docs for settings check
                // Firestore limit for GetAllSnapshots is not strictly documented as 10 but usually limited by request size. 
                // Safest to chunk by 100.
                var validRecipients = new List<string>();
                var chunks = recipientIds.Chunk(100);

                foreach (var userChunk in chunks)
                {
                    var userRefs = userChunk.Select(uid => _firestoreDb.Collection("users").Document(uid)).ToArray();
                    var userSnapshots = await _firestoreDb.GetAllSnapshotsAsync(userRefs);

                    foreach (var userDoc in userSnapshots)
                    {
                         if (!userDoc.Exists) continue;

                         // Settings Check
                         if (!string.IsNullOrEmpty(requiredSettingKey))
                         {
                             if (userDoc.TryGetValue("notificationSettings", out Dictionary<string, object> settings))
                             {
                                 if (settings.TryGetValue(requiredSettingKey, out var settingVal) && settingVal is bool b && b == false)
                                     continue;
                             }
                         }
                         validRecipients.Add(userDoc.Id);
                    }
                }

                if (validRecipients.Count == 0) return;

                 // 2. Batch write notifications
                var notificationsRef = _firestoreDb.Collection("notifications");
                var writeBatches = validRecipients.Chunk(400);

                foreach (var chunk in writeBatches)
                {
                    var batch = _firestoreDb.StartBatch();
                    foreach (var recipientId in chunk)
                    {
                        var notifData = new
                        {
                            recipientId = recipientId,
                            type = type,
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
                    await batch.CommitAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending batched notifications");
            }
        }

        public async Task NotifyNovelUpdateAsync(string authorName, string novelTitle, string novelId, string novelCover, string updateType)
        {
            string message = "";
            string type = "system";
            string link = $"/kitap/{novelId}";
            string requiredKey = "pushNewChapters"; // Default to chapters

            if (updateType == "new_chapter")
            {
                message = $"{novelTitle} serisinin yeni bölümü yayınlandı!";
                requiredKey = "pushNewChapters";
            }
            else if (updateType == "new_novel")
            {
                message = $"{authorName}, yeni bir seri yayınladı: {novelTitle}";
                requiredKey = "pushNewChapters"; // Reusing this key for now as "New Content"
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
                novelCover,
                requiredKey
            );
        }
        public async Task NotifyNovelSubscribersAsync(string novelId, string novelTitle, string novelCover)
        {
            if (_firestoreDb == null) return;
            
            try 
            {
                // Query libraries for this novel where status is 'reading'
                var librariesRef = _firestoreDb.Collection("libraries");
                
                // Firestore queries are limited. We need exact match.
                // Assuming novelId is stored as number in Firestore (based on library-service.ts)
                if (!int.TryParse(novelId, out int nid)) return; // Should be int

                var query = librariesRef.WhereEqualTo("novelId", nid).WhereEqualTo("status", "reading");
                var snapshot = await query.GetSnapshotAsync();
                
                if (snapshot.Count == 0) return;

                var recipientIds = new List<string>();
                foreach (var doc in snapshot.Documents)
                {
                    if (doc.ContainsField("userId"))
                    {
                        var uid = doc.GetValue<string>("userId");
                        if (!string.IsNullOrEmpty(uid)) recipientIds.Add(uid);
                    }
                }

                if (recipientIds.Count > 0)
                {
                    await NotifyUsersAsync(
                        recipientIds, 
                        "Yeni Bölüm!", 
                        $"{novelTitle} serisinin yeni bölümü yayınlandı.", 
                        novelId, 
                        $"/kitap/{novelId}", 
                        "new_chapter", 
                        "Sistem", 
                        "", 
                        "pushNewChapters" // Setting key
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking subscribers for {NovelId}", novelId);
            }
        }
    }
}
