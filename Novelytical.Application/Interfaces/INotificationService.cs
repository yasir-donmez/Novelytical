namespace Novelytical.Application.Interfaces;

public interface INotificationService
{
    Task NotifyReviewCommentAsync(string recipientFirebaseUid, string senderName, string senderImage, string reviewId, string novelId, string commentContent);
    Task NotifyReviewLikeAsync(string recipientFirebaseUid, string senderName, string senderImage, string reviewId, string novelId);
    Task NotifyCommentLikeAsync(string recipientFirebaseUid, string senderName, string senderImage, string commentId, string novelId);
}
