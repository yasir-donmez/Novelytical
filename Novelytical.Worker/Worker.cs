using System.Text.RegularExpressions;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using Novelytical.Data;
using System.Net;
using Novelytical.Application.DTOs;
using System.Globalization;
using Novelytical.Application.Interfaces;
using Pgvector;

namespace Novelytical.Worker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IEmbedder _embedder; // Injected Embedder

        // Novel Fire URL
        // Novel Fire URLs
        private const string BaseUrlPopular = "https://novelfire.net/genre-all/sort-popular/status-all/all-novel";
        private const string BaseUrlLatest = "https://novelfire.net/latest-release-novels";

        public Worker(ILogger<Worker> logger, IServiceProvider serviceProvider, IEmbedder embedder)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _embedder = embedder;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // 🛠️ FIX: Ensure DB column matches our 384-dimension local model
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                try
                {
                    // This will clear old embeddings (USING NULL) and set proper dimension
                    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE \"Novels\" ALTER COLUMN \"DescriptionEmbedding\" TYPE vector(384) USING NULL;", stoppingToken);
                    _logger.LogInformation("✅ DB Schema Fix: DescriptionEmbedding column set to vector(384).");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Schema fix skipped or failed (might be already correct): {ex.Message}");
                }
            }

            // 🚀 EKSİK VEKTÖRLERİ TAMAMLA
            // Sadece DescriptionEmbedding == null olanları işler
            await IndexMissingNovels(stoppingToken);

            // Start Concurrent Tasks
            var fastTrack = RunFastTrack(stoppingToken);
            var slowTrack = RunSlowTrack(stoppingToken);

            await Task.WhenAll(fastTrack, slowTrack);
        }

        private async Task RunFastTrack(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 HIZLI TAKİP (Fast Track) Başlatılıyor... (30 dakikada bir)");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("🔥 HIZLI TAKİP: 'Latest Release' taranıyor (Sayfa 1-5)...");
                    await ScrapePages(BaseUrlLatest, 5, "FastTrack", stoppingToken);
                    _logger.LogInformation("💤 HIZLI TAKİP: Bitti. 30 dakika mola...");
                    await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ HIZLI TAKİP Hatası!");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Hata durumunda kısa bekle
                }
            }
        }

        private async Task RunSlowTrack(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🐢 YAVAŞ TAKİP (Slow Track) Başlatılıyor... (Tüm Arşiv)");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("📚 YAVAŞ TAKİP: Toplam sayfa sayısı tespit ediliyor...");
                    
                    // 1. Toplam sayfa sayısını bul
                    var web = new HtmlWeb();
                    web.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
                    
                    int totalPages = 100; // Fallback
                    try 
                    {
                         var doc = await web.LoadFromWebAsync(BaseUrlPopular);
                         // Pagination Selector: <div class="pagination"> ... <li class="PagedList-skipToLast"><a href="...page=639">Last</a></li>
                         // Or try to find the last number in pagination
                         var lastPageNode = doc.DocumentNode.SelectSingleNode("//div[contains(@class, 'pagination')]//li[contains(@class, 'PagedList-skipToLast')]//a") 
                                            ?? doc.DocumentNode.SelectSingleNode("//ul[contains(@class, 'pagination')]//li[last()-1]//a");
                         
                         if (lastPageNode != null)
                         {
                             var href = lastPageNode.GetAttributeValue("href", "");
                             var match = Regex.Match(href, @"page=(\d+)");
                             if (match.Success)
                             {
                                 totalPages = int.Parse(match.Groups[1].Value);
                                 _logger.LogInformation($"✅ YAVAŞ TAKİP: Toplam {totalPages} sayfa tespit edildi.");
                             }
                         }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"⚠️ Sayfa sayısı tespit edilemedi, varsayılan (100) kullanılıyor: {ex.Message}");
                    }

                    _logger.LogInformation($"📚 YAVAŞ TAKİP: Tarama başlıyor (1 - {totalPages})...");
                    
                    await ScrapePages(BaseUrlPopular, totalPages, "SlowTrack", stoppingToken); 
                    
                    _logger.LogInformation("💤 YAVAŞ TAKİP: Tüm liste bitti. 24 saat mola...");
                    await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ YAVAŞ TAKİP Hatası!");
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
                }
            }
        }

        private async Task ScrapePages(string baseUrl, int maxPages, string trackName, CancellationToken stoppingToken)
        {
            var web = new HtmlWeb();
            web.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

            for (int page = 1; page <= maxPages; page++)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // --- 🕵️‍♀️ STEALTH MODE: Pause 1 min every 10 pages ---
                if (page > 1 && page % 10 == 0)
                {
                    _logger.LogInformation($"[{trackName}] ☕ Mola: {page} sayfa tarandı. Dikkat çekmemek için 1 dakika bekleniyor...");
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }

                // Handle URL parameters correctly
                string separator = baseUrl.Contains("?") ? "&" : "?";
                string pageUrl = $"{baseUrl}{separator}page={page}";
                
                _logger.LogInformation($"[{trackName}] 📄 Taranıyor: Sayfa {page}/{maxPages} ({pageUrl})");

                HtmlDocument listDoc;
                try
                {
                    listDoc = await web.LoadFromWebAsync(pageUrl);
                }
                catch (Exception ex)
                {
                    _logger.LogError($"[{trackName}] Sayfa yüklenemedi ({page}): {ex.Message}");
                    continue;
                }

                // Selector for Novel Fire List Items
                var novelNodes = listDoc.DocumentNode.SelectNodes("//li[contains(@class, 'novel-item')]");

                if (novelNodes != null)
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        foreach (var node in novelNodes)
                        {
                            if (stoppingToken.IsCancellationRequested) break;

                            // --- BİLGİLERİ TOPLA (Novel Fire) ---
                            // Structure: <li class="novel-item"><a href="/book/slug"><h4 class="novel-title">Title</h4></a>...</li>
                            var linkNode = node.SelectSingleNode("./a");
                            var titleNode = linkNode?.SelectSingleNode(".//h4[contains(@class, 'novel-title')]");

                            var relativeUrl = linkNode?.GetAttributeValue("href", "");
                            var fullUrl = "https://novelfire.net" + relativeUrl;
                            var title = titleNode?.InnerText.Trim();

                            if (string.IsNullOrEmpty(fullUrl) || string.IsNullOrEmpty(title)) continue;

                            // --- Detay Sayfası ---
                            _logger.LogInformation($"[{trackName}] 🔍 Detaylar çekiliyor: {title}");
                            HtmlDocument detailDoc;
                            try
                            {
                                detailDoc = await web.LoadFromWebAsync(fullUrl);
                                await Task.Delay(1000); // Politeness delay
                            }
                            catch
                            {
                                _logger.LogWarning($"[{trackName}] Detay sayfası yüklenemedi: {fullUrl}");
                                continue;
                            }

                            var detailNode = detailDoc.DocumentNode;

                            // Author: <div class="author">...<span itemprop="author">Name</span></div>
                            // Author: <a class="property-item" href="/author/...">Name</a>
                            var authorNode = detailNode.SelectSingleNode("//a[contains(@class, 'property-item')][contains(@href, '/author/')]");
                            var author = authorNode?.InnerText.Trim() ?? "Bilinmeyen";

                            // Description: <div class="content">...</div>
                            var descNode = detailNode.SelectSingleNode("//div[contains(@class, 'content')][contains(@class, 'expand-wrapper')]")
                                           ?? detailNode.SelectSingleNode("//div[contains(@class, 'summary')]//div[contains(@class, 'content')]");
                            string rawDescription = descNode?.InnerHtml ?? "";
                            string cleanDescription = CleanText(rawDescription);

                            // Stats
                            // Chapters
                            var chapterNode = detailNode.SelectSingleNode("//div[contains(@class, 'header-stats')]//span[1]//strong");
                            int chapterCount = ParseInt(chapterNode?.InnerText);

                            // View Count (2nd item)
                            var viewNode = detailNode.SelectSingleNode("//div[contains(@class, 'header-stats')]//span[2]//strong");
                            int viewCount = ParseViewCount(viewNode?.InnerText);

                            // Status (4th item)
                            var statusNode = detailNode.SelectSingleNode("//div[contains(@class, 'header-stats')]//span[4]//strong");
                            string status = statusNode?.InnerText.Trim() ?? "Unknown";

                            // Scrape Rating
                            decimal scrapedRating = 0;
                            try
                            {
                                // Priority 1: <strong class="nub">4.8</strong> (Visible text)
                                var nubNode = detailNode.SelectSingleNode("//strong[contains(@class, 'nub')]");
                                if (nubNode != null && decimal.TryParse(nubNode.InnerText.Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out decimal r1))
                                {
                                    scrapedRating = r1;
                                }
                                else
                                {
                                    // Priority 2: data-rating attribute
                                    var ratingNode = detailNode.SelectSingleNode("//div[contains(@class, 'my-rating')]");
                                    if (ratingNode != null)
                                    {
                                        var ratingText = ratingNode.GetAttributeValue("data-rating", "");
                                        if (decimal.TryParse(ratingText, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal r2))
                                        {
                                            scrapedRating = r2;
                                        }
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning("Rating parse error for {Title}: {Message}", title, ex.Message);
                            }

                            // Tags & Genres (Combine both)
                            var genreNodes = detailNode.SelectNodes("//a[contains(@class, 'property-item')][contains(@href, '/genre-')]");
                            var tagNodes = detailNode.SelectNodes("//a[contains(@class, 'tag')]");

                            var tagsList = new HashSet<string>(); // Use HashSet to avoid duplicates
                            if (genreNodes != null) foreach (var t in genreNodes) tagsList.Add(t.InnerText.Trim());
                            if (tagNodes != null) foreach (var t in tagNodes) tagsList.Add(t.InnerText.Trim());

                            // Cover Image
                            var imgNode = detailNode.SelectSingleNode("//figure[contains(@class, 'cover')]//img")
                                          ?? detailNode.SelectSingleNode("//div[contains(@class, 'novel-info')]//img");

                            // Fix: Check data-src first, then src
                            var coverUrl = imgNode?.GetAttributeValue("data-src", null);
                            if (string.IsNullOrEmpty(coverUrl)) coverUrl = imgNode?.GetAttributeValue("src", "");

                            // Fix: Handle relative URLs
                            if (!string.IsNullOrEmpty(coverUrl) && coverUrl.StartsWith("/"))
                            {
                                coverUrl = "https://novelfire.net" + coverUrl;
                            }

                            // --- 🧠 VEKTÖR HESAPLAMA ---
                            Vector? embeddingVector = null;
                            if (!string.IsNullOrEmpty(cleanDescription))
                            {
                                try
                                {
                                    var embeddingResult = await _embedder.EmbedAsync(cleanDescription);
                                    embeddingVector = new Vector(embeddingResult);
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "Embedding error");
                                }
                            }

                            // --- VERİTABANI KAYIT ---
                            var novel = await dbContext.Novels
                                .Include(n => n.NovelTags)
                                .FirstOrDefaultAsync(n => n.SourceUrl == fullUrl || n.Title == title); // Check title too to prevent dupes if URL changes

                            // Last Updated Parsing
                            DateTime lastUpdated = DateTime.UtcNow;
                            var updatedNode = detailNode.SelectSingleNode("//a[contains(@class, 'chapter-latest-container')]//p[contains(@class, 'update')]");
                            if (updatedNode != null)
                            {
                                var updatedText = updatedNode.InnerText.Trim(); // "Updated 3 years ago"
                                lastUpdated = ParseRelativeTime(updatedText);
                            }

                            if (novel == null)
                            {
                                novel = new Novel
                                {
                                    Title = title ?? "Başlıksız",
                                    SourceUrl = fullUrl,
                                    Author = author,
                                    NovelTags = new List<NovelTag>()
                                };
                                dbContext.Novels.Add(novel);
                            }
                            
                            // 🧠 SMART SAVE: Değişiklik kontrolü (Gereksiz yazmayı önle)
                            bool hasChanges = false;
                            
                            if (novel.ViewCount != viewCount) { novel.ViewCount = viewCount; hasChanges = true; }
                            if (novel.ChapterCount != chapterCount) { novel.ChapterCount = chapterCount; hasChanges = true; }
                            if (novel.ScrapedRating != scrapedRating && scrapedRating > 0) { novel.ScrapedRating = scrapedRating; hasChanges = true; }
                            if (novel.Status != status) { novel.Status = status; hasChanges = true; }
                            
                            // Tarih kontrolü: Eğer veritabanındaki tarih daha eskise güncelle
                            if ((novel.LastUpdated - lastUpdated).Duration() > TimeSpan.FromMinutes(5)) 
                            { 
                                novel.LastUpdated = lastUpdated; 
                                hasChanges = true; 
                            }

                            // Diğer alanlar
                            if (novel.Author != author) { novel.Author = author; hasChanges = true; }
                            
                            // 🧠 SMART DESCRIPTION UPDATE: Description değişirse Vektör de değişmeli!
                            if (novel.Description != cleanDescription) 
                            { 
                                novel.Description = cleanDescription; 
                                hasChanges = true;
                                
                                // Description değiştiği için embedding artık geçersiz, null yapıp yeniden hesaplatacağız
                                // Veya anlık hesaplayabiliriz:
                                if (!string.IsNullOrEmpty(cleanDescription))
                                {
                                    try 
                                    {
                                        var newVector = await _embedder.EmbedAsync(cleanDescription);
                                        novel.DescriptionEmbedding = new Vector(newVector);
                                        _logger.LogInformation($"✨ Vektör güncellendi: {title}");
                                    }
                                    catch (Exception ex)
                                    {
                                        _logger.LogError(ex, "Vektör güncelleme hatası");
                                    }
                                }
                            }

                            if (novel.CoverUrl != coverUrl) { novel.CoverUrl = coverUrl; hasChanges = true; }

                            if (embeddingVector != null && novel.DescriptionEmbedding == null) // Sadece eksikse ekle (İlk kayıt veya migration)
                            {
                                novel.DescriptionEmbedding = embeddingVector;
                                hasChanges = true;
                            }

                            if (hasChanges)
                            {
                                await dbContext.SaveChangesAsync();
                            }

                            // Etiket Bağlantıları
                            foreach (var tagName in tagsList)
                            {
                                var tag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name == tagName);
                                if (tag == null) { tag = new Tag { Name = tagName }; dbContext.Tags.Add(tag); await dbContext.SaveChangesAsync(); }

                                if (!await dbContext.NovelTags.AnyAsync(nt => nt.NovelId == novel.Id && nt.TagId == tag.Id))
                                {
                                    dbContext.NovelTags.Add(new NovelTag { NovelId = novel.Id, TagId = tag.Id });
                                    hasChanges = true; // Etiket eklendiyse de logla
                                }
                            }
                            
                            // Sadece değişiklik varsa kaydet (Etiket döngüsü içinde SaveChanges zaten çağrılıyor ama garanti olsun)
                            // await dbContext.SaveChangesAsync(); <- Zaten yukarıda yapılıyor

                            if (hasChanges)
                            {
                                _logger.LogInformation($"[{trackName}] 💾 GÜNCELLENDİ: {title} (Değişiklik tespit edildi)");
                            }
                            else
                            {
                                _logger.LogInformation($"[{trackName}] ⏩ ATLANDI: {title} (Değişiklik yok)");
                            }
                        }
                    }
                }
            }
        }

        private async Task IndexMissingNovels(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🔄 MIGRATION BAŞLADI: Eksik vektörler tamamlanıyor...");
            
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                
                // Sadece vektörü eksik olanları getir
                var novels = await dbContext.Novels
                    .Where(n => !string.IsNullOrEmpty(n.Description) && n.DescriptionEmbedding == null)
                    .ToListAsync(stoppingToken);

                if (novels.Count == 0)
                {
                    _logger.LogInformation("✅ Tüm romanların vektörleri tam. İşlem gerekmiyor.");
                    return;
                }

                _logger.LogInformation($"⚠️ {novels.Count} romanın vektörü eksik. Hesaplanıyor...");
                var count = novels.Count;
                int processed = 0;
                
                var parallelOptions = new ParallelOptions 
                { 
                    MaxDegreeOfParallelism = Environment.ProcessorCount, 
                    CancellationToken = stoppingToken 
                };

                var embeddingResults = new System.Collections.Concurrent.ConcurrentBag<(Novel Novel, Vector Vec)>();

                await Parallel.ForEachAsync(novels, parallelOptions, async (novel, token) =>
                {
                    try 
                    {
                        var vector = await _embedder.EmbedAsync(novel.Description!);
                        embeddingResults.Add((novel, new Vector(vector)));
                        Interlocked.Increment(ref processed);
                        if (processed % 50 == 0) _logger.LogInformation($"⚡ Generating Embeddings: {processed}/{count}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Embedding generation failed for novel {Id}", novel.Id);
                    }
                });

                _logger.LogInformation("Saving embeddings to database in batches...");
                
                int savedCount = 0;
                foreach(var result in embeddingResults)
                {
                    var novel = result.Novel;
                    novel.DescriptionEmbedding = result.Vec;
                    dbContext.Entry(novel).State = EntityState.Modified;
                    
                    savedCount++;
                    if (savedCount % 100 == 0)
                    {
                        try 
                        {
                            await dbContext.SaveChangesAsync(stoppingToken);
                            _logger.LogInformation($"💾 Saved batch {savedCount}/{embeddingResults.Count}");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "❌ DB Save Error: {Message}", ex.Message);
                        }
                    }
                }

                try 
                {
                    await dbContext.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation("✅ EKSİK VEKTÖRLER TAMAMLANDI.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Final DB Save Error: {Message}", ex.Message);
                }
            }
        }

        private string CleanText(string? text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            string clean = WebUtility.HtmlDecode(text);
            
            // Preserve paragraphs
            clean = clean.Replace("<br>", "\n").Replace("<br/>", "\n").Replace("<br />", "\n");
            clean = clean.Replace("</p>", "\n\n");
            
            clean = Regex.Replace(clean, @"<[^>]+>", ""); // Remove other tags
            clean = clean.Replace("Show More", "").Replace("Show Less", ""); // Remove specific scraping artifacts
            clean = Regex.Replace(clean, @"\n\s+\n", "\n\n"); // Normalize multiple newlines
            return clean.Trim();
        }

        private int ParseViewCount(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            // Handle "66.5K", "1.2M", etc.
            text = text.ToUpper().Trim();
            decimal multiplier = 1;
            if (text.EndsWith("K")) multiplier = 1000;
            if (text.EndsWith("M")) multiplier = 1000000;
            
            string digits = Regex.Replace(text, @"[^\d\.]", ""); // Keep decimal point
            if (decimal.TryParse(digits, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out decimal result))
            {
                return (int)(result * multiplier);
            }
            return 0;
        }

        private int ParseInt(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            // Remove non-digits
            string digits = Regex.Replace(text, @"[^\d]", "");
            if (int.TryParse(digits, out int result)) return result;
            return 0;
        }
        private DateTime ParseRelativeTime(string? text)
        {
            if (string.IsNullOrEmpty(text)) return DateTime.UtcNow;

            // Example: "Updated 3 years ago" -> "3 years"
            text = text.Replace("Updated", "").Replace("ago", "").Trim().ToLower(System.Globalization.CultureInfo.InvariantCulture);
            
            int quantity = 1;
            var match = Regex.Match(text, @"\d+");
            if (match.Success)
            {
                int.TryParse(match.Value, out quantity);
            }

            if (text.Contains("year")) return DateTime.UtcNow.AddYears(-quantity);
            if (text.Contains("month")) return DateTime.UtcNow.AddMonths(-quantity);
            if (text.Contains("week")) return DateTime.UtcNow.AddDays(-quantity * 7);
            if (text.Contains("day")) return DateTime.UtcNow.AddDays(-quantity);
            if (text.Contains("hour")) return DateTime.UtcNow.AddHours(-quantity);
            if (text.Contains("minute")) return DateTime.UtcNow.AddMinutes(-quantity);
            if (text.Contains("second")) return DateTime.UtcNow.AddSeconds(-quantity);

            return DateTime.UtcNow;
        }
    }
}