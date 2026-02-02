using FirebaseAdmin;
using Google.Cloud.Firestore;
using Hangfire;

namespace Novelytical.Web.Jobs;

public class NotificationCleanupJob
{
    private readonly ILogger<NotificationCleanupJob> _logger;
    private readonly FirestoreDb? _firestoreDb;

    public NotificationCleanupJob(ILogger<NotificationCleanupJob> logger)
    {
        _logger = logger;
        try
        {
            // Initialize Firestore using the implicit default app or environment credentials
            // Assuming FirebaseApp.DefaultInstance is already configured in Program.cs
            if (FirebaseApp.DefaultInstance != null)
            {
                _firestoreDb = FirestoreDb.Create(FirebaseApp.DefaultInstance.Options.ProjectId);
            }
            else
            {
                _logger.LogWarning("FirebaseApp.DefaultInstance is null. Notification cleanup cannot proceed.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize FirestoreDb for NotificationCleanupJob");
        }
    }

    [AutomaticRetry(Attempts = 0)] // Don't retry immediately if it fails, wait for next scheduled run
    public async Task Execute()
    {
        if (_firestoreDb == null)
        {
            _logger.LogWarning("Skipping NotificationCleanupJob because FirestoreDb is not initialized.");
            return;
        }

        _logger.LogInformation("Starting Notification Cleanup Job...");

        try
        {
            var usersCollection = _firestoreDb.Collection("users");
            var usersSnapshot = await usersCollection.GetSnapshotAsync();

            int totalDeleted = 0;

            foreach (var userDoc in usersSnapshot.Documents)
            {
                var settings = new Dictionary<string, object>();
                int retentionDays = 30; // Default retention

                if (userDoc.TryGetValue("notificationSettings", out Dictionary<string, object> userSettings))
                {
                    if (userSettings != null && 
                        userSettings.TryGetValue("retentionDays", out var val) && 
                        val != null) // Check for null explicitly
                    {
                        try 
                        {
                            retentionDays = Convert.ToInt32(val);
                        }
                        catch
                        {
                            // fallback to default if conversion fails
                        }
                    }
                }

                // Safety check: Don't allow less than 1 day to prevent accidents
                if (retentionDays < 1) retentionDays = 30;

                var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
                var cutoffTimestamp = Timestamp.FromDateTime(cutoffDate);

                // Query notifications for this user that are older than cutoff
                var notificationsRef = _firestoreDb.Collection("notifications");
                var query = notificationsRef
                    .WhereEqualTo("recipientId", userDoc.Id)
                    .WhereLessThan("createdAt", cutoffTimestamp);

                // Execute query
                var oldNotifications = await query.GetSnapshotAsync();

                if (oldNotifications.Count > 0)
                {
                    _logger.LogInformation($"Deleting {oldNotifications.Count} notifications for user {userDoc.Id} (Retention: {retentionDays} days)");

                    // Batch delete (limit 500 per batch)
                    var batch = _firestoreDb.StartBatch();
                    int batchCount = 0;

                    foreach (var note in oldNotifications.Documents)
                    {
                        batch.Delete(note.Reference);
                        batchCount++;
                        totalDeleted++;

                        if (batchCount >= 400) // Commit safely below limit
                        {
                            await batch.CommitAsync();
                            batch = _firestoreDb.StartBatch();
                            batchCount = 0;
                        }
                    }

                    if (batchCount > 0)
                    {
                        await batch.CommitAsync();
                    }
                }
            }

            _logger.LogInformation($"Notification Cleanup Completed. Total deleted: {totalDeleted}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during Notification Cleanup Job");
            throw; // Let Hangfire know it failed
        }
    }
}
