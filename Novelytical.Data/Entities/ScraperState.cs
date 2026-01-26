namespace Novelytical.Data
{
    /// <summary>
    /// Scraper'ın durumunu (son taranan sayfa, son çalışma zamanı vb.) takip etmek için kullanılır.
    /// GitHub Actions scheduled jobs ile çalışırken state yönetimi için kritik.
    /// </summary>
    public class ScraperState
    {
        /// <summary>
        /// State anahtarı. Örnek: "slow_track_page", "fast_track_last_run"
        /// </summary>
        public string Key { get; set; } = string.Empty;

        /// <summary>
        /// State değeri. JSON veya basit string olabilir.
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// Son güncelleme zamanı.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
