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
        private readonly IEmbedder _embedder;
        private readonly IConfiguration _configuration;

        // XPath Constants
        private static class XPaths
        {
            public const string NovelListItems = "//li[contains(@class, 'novel-item')]";
            public const string NovelTitle = ".//h4[contains(@class, 'novel-title')]";
            public const string NovelLink = "./a";
            
            public const string DetailAuthor = "//a[contains(@class, 'property-item')][contains(@href, '/author/')]";
            public const string DetailDescription = "//div[contains(@class, 'content')][contains(@class, 'expand-wrapper')] | //div[contains(@class, 'summary')]//div[contains(@class, 'content')]";
            public const string DetailChapterCount = "//div[contains(@class, 'header-stats')]//span[1]//strong";
            public const string DetailViewCount = "//div[contains(@class, 'header-stats')]//span[2]//strong";
            public const string DetailStatus = "//div[contains(@class, 'header-stats')]//span[4]//strong";
            public const string DetailRatingNub = "//strong[contains(@class, 'nub')]";
            public const string DetailRatingData = "//div[contains(@class, 'my-rating')]";
            public const string DetailGenres = "//a[contains(@class, 'property-item')][contains(@href, '/genre-')]";
            public const string DetailTags = "//a[contains(@class, 'tag')]";
            public const string DetailCover = "//figure[contains(@class, 'cover')]//img | //div[contains(@class, 'novel-info')]//img";
            public const string DetailLastUpdated = "//a[contains(@class, 'chapter-latest-container')]//p[contains(@class, 'update')]";
        }

        // User Agents Rotation
        private readonly string[] _userAgents = new[]
        {
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0"
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _cache; // 🚀

        public Worker(ILogger<Worker> logger, IServiceProvider serviceProvider, IEmbedder embedder, IConfiguration configuration, IHttpClientFactory httpClientFactory, Microsoft.Extensions.Caching.Distributed.IDistributedCache cache)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _embedder = embedder;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // 🚀 EKSİK VEKTÖRLERİ TAMAMLA (Arka Planda)
            // Ana akışı bloklamadan arka planda çalışsın
            _ = Task.Run(() => IndexMissingNovels(stoppingToken), stoppingToken);

            // Start Concurrent Tasks
            var fastTrack = RunFastTrack(stoppingToken);
            var slowTrack = RunSlowTrack(stoppingToken);

            await Task.WhenAll(fastTrack, slowTrack);
        }

        private async Task RunFastTrack(CancellationToken stoppingToken)
        {
            string url = _configuration["NovelFire:BaseUrlLatest"] ?? "https://novelfire.net/latest-release-novels";
            _logger.LogInformation($"🚀 HIZLI TAKİP Başlatılıyor... ({url})");
            
            // Create a dedicated client for this track if needed, or use factory per request
            // Typically scraping sessions might benefit from cookie persistence, but for simple fetching factory is fine.

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ScrapePages(url, 5, "FastTrack", stoppingToken);
                    _logger.LogInformation("💤 HIZLI TAKİP: Bitti. 30 dakika mola...");
                    await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ HIZLI TAKİP Hatası!");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
            }
        }

        private async Task RunSlowTrack(CancellationToken stoppingToken)
        {
            string url = _configuration["NovelFire:BaseUrlPopular"] ?? "https://novelfire.net/genre-all/sort-popular/status-all/all-novel";
            _logger.LogInformation($"🐢 YAVAŞ TAKİP Başlatılıyor... ({url})");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Pass client to GetTotalPages
                    int totalPages = await GetTotalPages(url);
                    _logger.LogInformation($"📚 YAVAŞ TAKİP: Toplam {totalPages} sayfa taranacak...");
                    
                    await ScrapePages(url, totalPages, "SlowTrack", stoppingToken);
                    
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

        private async Task<int> GetTotalPages(string baseUrl)
        {
            try
            {
                var doc = await FetchWithRetry(baseUrl);
                var lastPageNode = doc.DocumentNode.SelectSingleNode("//div[contains(@class, 'pagination')]//li[contains(@class, 'PagedList-skipToLast')]//a") 
                                   ?? doc.DocumentNode.SelectSingleNode("//ul[contains(@class, 'pagination')]//li[last()-1]//a");
                
                if (lastPageNode != null)
                {
                    var href = lastPageNode.GetAttributeValue("href", "");
                    var match = Regex.Match(href, @"page=(\d+)");
                    if (match.Success && int.TryParse(match.Groups[1].Value, out int pages))
                    {
                        return pages;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"⚠️ Sayfa sayısı alınamadı: {ex.Message}");
            }
            return 100; // Default fallback
        }

        private async Task ScrapePages(string baseUrl, int maxPages, string trackName, CancellationToken stoppingToken)
        {
            for (int page = 1; page <= maxPages; page++)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // Stealth Mode: Random Jitter
                if (page > 1 && page % 10 == 0)
                {
                    int delay = Random.Shared.Next(45, 75); // 45-75 seconds
                    _logger.LogInformation($"[{trackName}] ☕ Mola ({delay}sn)...");
                    await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken);
                }

                string separator = baseUrl.Contains("?") ? "&" : "?";
                string pageUrl = $"{baseUrl}{separator}page={page}";
                
                _logger.LogInformation($"[{trackName}] 📄 Sayfa {page}/{maxPages}");

                try 
                {
                    var listDoc = await FetchWithRetry(pageUrl);
                    var novelNodes = listDoc.DocumentNode.SelectNodes(XPaths.NovelListItems);
                    
                    if (novelNodes != null)
                    {
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            // İşlem sırasında ID çakışmalarını önlemek için sıralı işle
                            foreach (var node in novelNodes)
                            {
                                if (stoppingToken.IsCancellationRequested) break;
                                await ProcessNovelNode(node, dbContext, trackName);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                     _logger.LogError($"Skip page {page}: {ex.Message}");
                }
            }
        }

        private async Task ProcessNovelNode(HtmlNode node, AppDbContext dbContext, string trackName)
        {
            var linkNode = node.SelectSingleNode(XPaths.NovelLink);
            var titleNode = linkNode?.SelectSingleNode(XPaths.NovelTitle);

            var relativeUrl = linkNode?.GetAttributeValue("href", "");
            if (string.IsNullOrEmpty(relativeUrl)) return;

            var fullUrl = "https://novelfire.net" + relativeUrl;
            var title = titleNode?.InnerText.Trim();

            if (string.IsNullOrEmpty(fullUrl) || string.IsNullOrEmpty(title)) return;

            try 
            {
                // Fetch details
                await Task.Delay(Random.Shared.Next(500, 1500)); // Random IO wait
                var detailDoc = await FetchWithRetry(fullUrl);
                var detailNode = detailDoc.DocumentNode;

                var novelData = ParseNovelDetails(detailNode, fullUrl, title);
                
                await SaveOrUpdateNovel(dbContext, novelData, trackName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"[{trackName}] Hata ({title}): {ex.Message}");
            }
        }

        // Exponential Backoff ile Hata Yönetimi
        private async Task<HtmlDocument> FetchWithRetry(string url)
        {
            int maxRetries = 3;
            int delay = 2000; // Başlangıç bekleme süresi (2 saniye)

            for (int i = 0; i < maxRetries; i++)
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("User-Agent", GetRandomUserAgent());
                client.Timeout = TimeSpan.FromSeconds(30);

                try
                {
                    var response = await client.GetAsync(url);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var html = await response.Content.ReadAsStringAsync();
                        var doc = new HtmlDocument();
                        doc.LoadHtml(html);
                        return doc;
                    }
                    else if (response.StatusCode == HttpStatusCode.TooManyRequests || response.StatusCode == HttpStatusCode.Forbidden)
                    {
                        _logger.LogWarning($"⚠️ {response.StatusCode} Hatası. {delay/1000}sn bekleniyor...");
                        await Task.Delay(delay);
                        delay *= 2; // Bekleme süresini katla (Exponential Backoff)
                    }
                    else
                    {
                        // Diğer hatalar (500, 404 vs.) için normal retry
                        response.EnsureSuccessStatusCode(); 
                    }
                }
                catch (Exception ex) when (i < maxRetries - 1)
                {
                     _logger.LogWarning($"⚠️ İstek Hatası: {ex.Message}. Tekrar deneniyor...");
                     await Task.Delay(delay);
                }
            }
            throw new Exception($"Failed to fetch {url} after {maxRetries} attempts.");
        }

        private Novel ParseNovelDetails(HtmlNode detailNode, string fullUrl, string title)
        {
            var author = detailNode.SelectSingleNode(XPaths.DetailAuthor)?.InnerText.Trim() ?? "Bilinmeyen";
            
            var descNode = detailNode.SelectSingleNode(XPaths.DetailDescription);
            string cleanDescription = CleanText(descNode?.InnerHtml);

            int chapterCount = ParseInt(detailNode.SelectSingleNode(XPaths.DetailChapterCount)?.InnerText);
            int viewCount = ParseViewCount(detailNode.SelectSingleNode(XPaths.DetailViewCount)?.InnerText);
            string status = detailNode.SelectSingleNode(XPaths.DetailStatus)?.InnerText.Trim() ?? "Unknown";

            decimal rating = 0;
            var ratingNub = detailNode.SelectSingleNode(XPaths.DetailRatingNub);
            if (ratingNub != null) 
                 decimal.TryParse(ratingNub.InnerText.Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out rating);
            else {
                 var ratingData = detailNode.SelectSingleNode(XPaths.DetailRatingData);
                 if (ratingData != null) decimal.TryParse(ratingData.GetAttributeValue("data-rating", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out rating);
            }

            var genres = detailNode.SelectNodes(XPaths.DetailGenres)?.Select(n => n.InnerText.Trim()) ?? Enumerable.Empty<string>();
            var tags = detailNode.SelectNodes(XPaths.DetailTags)?.Select(n => n.InnerText.Trim()) ?? Enumerable.Empty<string>();
            var allTags = new HashSet<string>(genres.Concat(tags));

            var imgNode = detailNode.SelectSingleNode(XPaths.DetailCover);
            var coverUrl = imgNode?.GetAttributeValue("data-src", string.Empty);
            if (string.IsNullOrEmpty(coverUrl)) coverUrl = imgNode?.GetAttributeValue("src", "");
            if (!string.IsNullOrEmpty(coverUrl) && coverUrl.StartsWith("/")) coverUrl = "https://novelfire.net" + coverUrl;

            DateTime lastUpdated = DateTime.UtcNow;
            var updatedNode = detailNode.SelectSingleNode(XPaths.DetailLastUpdated);
            if (updatedNode != null) lastUpdated = ParseRelativeTime(updatedNode.InnerText.Trim());

            return new Novel 
            {
                Title = title,
                SourceUrl = fullUrl,
                Author = author,
                Description = cleanDescription,
                ChapterCount = chapterCount,
                ViewCount = viewCount,
                Status = status,
                ScrapedRating = rating,
                CoverUrl = coverUrl,
                LastUpdated = lastUpdated,
                // Etiketleri geçici taşımak için string listesi olarak tutabiliriz 
                // ya da NovelTags içine 'yeni' olduklarını belirterek koyarız.
                // Burada NovelTags'i doldurup SaveOrUpdateNovel'da işleyeceğiz.
                NovelTags = allTags.Select(t => new NovelTag { Tag = new Tag { Name = t } }).ToList()
            };
        }

        private async Task SaveOrUpdateNovel(AppDbContext dbContext, Novel scrapedData, string trackName)
        {
            var dbNovel = await dbContext.Novels
                .Include(n => n.NovelTags)
                    .ThenInclude(nt => nt.Tag)
                .FirstOrDefaultAsync(n => n.SourceUrl == scrapedData.SourceUrl || n.Title == scrapedData.Title);

            bool isNew = dbNovel == null;
            bool hasChanges = false;

            if (isNew)
            {
                dbNovel = new Novel
                {
                    Title = scrapedData.Title,
                    SourceUrl = scrapedData.SourceUrl,
                    Author = scrapedData.Author,
                    NovelTags = new List<NovelTag>()
                };
                dbContext.Novels.Add(dbNovel);
            }

            // Map simple fields
            if (dbNovel!.ViewCount != scrapedData.ViewCount) { dbNovel.ViewCount = scrapedData.ViewCount; hasChanges = true; }
            if (dbNovel.ChapterCount != scrapedData.ChapterCount) { dbNovel.ChapterCount = scrapedData.ChapterCount; hasChanges = true; }
            if (dbNovel.ScrapedRating != scrapedData.ScrapedRating && scrapedData.ScrapedRating > 0) { dbNovel.ScrapedRating = scrapedData.ScrapedRating; hasChanges = true; }
            if (dbNovel.Status != scrapedData.Status) { dbNovel.Status = scrapedData.Status; hasChanges = true; }
            if (dbNovel.Author != scrapedData.Author) { dbNovel.Author = scrapedData.Author; hasChanges = true; }
            if (dbNovel.CoverUrl != scrapedData.CoverUrl) { dbNovel.CoverUrl = scrapedData.CoverUrl; hasChanges = true; }
            
            if ((dbNovel.LastUpdated - scrapedData.LastUpdated).Duration() > TimeSpan.FromMinutes(5)) 
            { 
                dbNovel.LastUpdated = scrapedData.LastUpdated; 
                hasChanges = true; 
            }

            // Description & Vector Logic
            if (dbNovel.Description != scrapedData.Description)
            {
                dbNovel.Description = scrapedData.Description;
                hasChanges = true;
                
                if (!string.IsNullOrEmpty(scrapedData.Description))
                {
                    try 
                    {
                        var newVector = await _embedder.EmbedAsync(scrapedData.Description);
                        dbNovel.DescriptionEmbedding = new Vector(newVector);
                        _logger.LogInformation($"✨ Vector updated: {dbNovel.Title}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Vector update failed");
                    }
                }
            }
            else if (isNew && !string.IsNullOrEmpty(scrapedData.Description))
            {
                 try 
                 {
                    var newVector = await _embedder.EmbedAsync(scrapedData.Description);
                    dbNovel.DescriptionEmbedding = new Vector(newVector);
                 } catch {}
            }

            // 🚀 BATCH TAG PROCESSING (N+1 Optimization)
            if (scrapedData.NovelTags != null && scrapedData.NovelTags.Any())
            {
                var inputTagNames = scrapedData.NovelTags.Select(nt => nt.Tag.Name).Distinct().ToList();
                
                // 1. Mevcut tagleri veritabanından topluca çek
                var existingDbTags = await dbContext.Tags
                    .Where(t => inputTagNames.Contains(t.Name))
                    .ToDictionaryAsync(t => t.Name, t => t);

                // 2. Olmayan tagleri bul ve oluştur (Hafızada)
                var newTags = new List<Tag>();
                foreach (var tagName in inputTagNames)
                {
                    if (!existingDbTags.ContainsKey(tagName))
                    {
                        var newTag = new Tag { Name = tagName };
                        newTags.Add(newTag);
                        existingDbTags[tagName] = newTag; // İleriki adımlar için sözlüğe de ekle
                    }
                }

                // 3. Yeni tagleri DB'ye ekle
                if (newTags.Any())
                {
                    dbContext.Tags.AddRange(newTags); // Batch insert
                    // Not: SaveChanges henüz çağırmıyoruz, en sonda çağıracağız.
                    // Ancak EF Core navigation fixup sayesinde ID oluşmasa bile ilişki kurulabilir.
                }

                // 4. Romanın tag listesini güncelle
                var currentTagIds = dbNovel.NovelTags.Select(nt => nt.TagId).ToHashSet();
                
                foreach (var tagName in inputTagNames)
                {
                    var tagEntity = existingDbTags[tagName];
                    
                    // Eğer bu ilişki zaten yoksa ekle
                    // Not: Yeni eklenen taglerin ID'si 0 olabilir ama Entity referansı var.
                    // EF Core duplicated ilişkiyi, hem NovelTags koleksiyonunda hem de ChangeTracker'da kontrol edersek daha güvenli olur.
                    
                    // Basit kontrol: dbNovel.NovelTags içinde bu Tag entity'sine sahip bir kayıt var mı?
                    bool alreadyLinked = dbNovel.NovelTags.Any(nt => nt.Tag == tagEntity || (nt.TagId != 0 && nt.TagId == tagEntity.Id));

                    if (!alreadyLinked)
                    {
                        dbNovel.NovelTags.Add(new NovelTag { Tag = tagEntity });
                        hasChanges = true;
                    }
                }
            }

            if (isNew || hasChanges)
            {
                await dbContext.SaveChangesAsync();
                _logger.LogInformation($"[{trackName}] {(isNew ? "🆕 NEW" : "💾 UPDATED")}: {dbNovel.Title}");

                // 🧹 CACHE INVALIDATION (Redis)
                // Roman değiştiği için önbelleği siliyoruz ki kullanıcılar eski veriyi görmesin.
                await _cache.RemoveAsync($"novel_details_{dbNovel.Id}");
                if (!string.IsNullOrEmpty(dbNovel.Slug))
                {
                    await _cache.RemoveAsync($"novel_details_{dbNovel.Slug.ToLower()}");
                }
            }
            else
            {
                _logger.LogInformation($"[{trackName}] ⏩ SKIP: {dbNovel.Title}");
            }
        }

        private async Task IndexMissingNovels(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🔄 MIGRATION: Checking missing vectors...");
            
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    
                    // Batch processing: Load 100 at a time to prevent OOM
                    var novels = await dbContext.Novels
                        .Where(n => !string.IsNullOrEmpty(n.Description) && n.DescriptionEmbedding == null)
                        .Take(100)
                        .ToListAsync(stoppingToken);

                    if (novels.Count == 0)
                    {
                        _logger.LogInformation("✅ Tüm romanların vektörleri tam.");
                        break; // All done
                    }

                    _logger.LogInformation($"⚠️ Processing batch of {novels.Count} missing vectors...");

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
                        }
                        catch (Exception ex)
                        {
                             _logger.LogError(ex, "Embedding failed ID: {Id}", novel.Id);
                        }
                    });

                    // Save batch
                    foreach(var result in embeddingResults)
                    {
                        var novel = result.Novel;
                        novel.DescriptionEmbedding = result.Vec;
                        dbContext.Entry(novel).State = EntityState.Modified;
                    }
                    
                    await dbContext.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation($"💾 Saved batch of {embeddingResults.Count}");
                }
            }
        }

        private string GetRandomUserAgent()
        {
            return _userAgents[Random.Shared.Next(_userAgents.Length)];
        }

        // --- Helpers ---

        private string CleanText(string? text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            string clean = WebUtility.HtmlDecode(text);
            clean = clean.Replace("<br>", "\n").Replace("<br/>", "\n").Replace("<br />", "\n");
            clean = clean.Replace("</p>", "\n\n");
            clean = Regex.Replace(clean, @"<[^>]+>", ""); 
            clean = clean.Replace("Show More", "").Replace("Show Less", "");
            clean = Regex.Replace(clean, @"\n\s+\n", "\n\n");
            return clean.Trim();
        }

        private int ParseViewCount(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            text = text.ToUpper().Trim();
            decimal multiplier = 1;
            if (text.EndsWith("K")) multiplier = 1000;
            if (text.EndsWith("M")) multiplier = 1000000;
            
            string digits = Regex.Replace(text, @"[^\d\.]", "");
            if (decimal.TryParse(digits, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal result))
            {
                return (int)(result * multiplier);
            }
            return 0;
        }

        private int ParseInt(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            string digits = Regex.Replace(text, @"[^\d]", "");
            if (int.TryParse(digits, out int result)) return result;
            return 0;
        }

        private DateTime ParseRelativeTime(string? text)
        {
            if (string.IsNullOrEmpty(text)) return DateTime.UtcNow;
            text = text.Replace("Updated", "").Replace("ago", "").Trim().ToLower(CultureInfo.InvariantCulture);
            
            int quantity = 1;
            var match = Regex.Match(text, @"\d+");
            if (match.Success) int.TryParse(match.Value, out quantity);

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