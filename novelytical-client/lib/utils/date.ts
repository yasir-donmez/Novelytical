export function getRelativeTimeString(date: Date | string): string {
    const now = new Date();
    const past = typeof date === 'string' ? new Date(date) : date;

    const diffMs = now.getTime() - past.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
        return `${diffSeconds} saniye önce`;
    } else if (diffMinutes < 60) {
        return `${diffMinutes} dakika önce`;
    } else if (diffHours < 24) {
        return `${diffHours} saat önce`;
    } else if (diffDays < 30) {
        return `${diffDays} gün önce`;
    } else if (diffMonths < 12) {
        return `${diffMonths} ay önce`;
    } else {
        return `${diffYears} yıl önce`;
    }
}
