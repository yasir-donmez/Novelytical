using System.Text.RegularExpressions;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using Novelytical.Data;
using System.Net;
using Novelytical.Application.DTOs;
using System.Globalization;
using Novelytical.Application.Interfaces;
using Pgvector;
using Novelytical.Services;

namespace Novelytical.Worker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IEmbedder _embedder;
        private readonly IConfiguration _configuration;
        private readonly IHostApplicationLifetime _lifetime;

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

        // ScraperState Keys
        private static class StateKeys
        {
            public const string SlowTrackPage = "slow_track_current_page";
            public const string SlowTrackTotalPages = "slow_track_total_pages";
            public const string LastFastTrackRun = "last_fast_track_run";
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
        private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _cache;

        public Worker(
            ILogger<Worker> logger, 
            IServiceProvider serviceProvider, 
            IEmbedder embedder, 
            IConfiguration configuration, 
            IHttpClientFactory httpClientFactory, 
            Microsoft.Extensions.Caching.Distributed.IDistributedCache cache,
            IHostApplicationLifetime lifetime)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _embedder = embedder;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _lifetime = lifetime;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // 🎯 GitHub Actions Mode: SCRAPE_MODE environment variable ile kontrol
            var mode = Environment.GetEnvironmentVariable("SCRAPE_MODE")?.ToLower() ?? "fast";
            
            _logger.LogInformation("🚀 Worker başlatılıyor. Mode: {Mode}", mode);

            try
            {
                switch (mode)
                {
                    case "fast":
                        await RunFastTrackOnce(stoppingToken);
                        break;
                    
                    case "slow":
                        await RunSlowTrackBatch(stoppingToken);
                        break;
                    
                    case "full":
                        // İlk büyük tarama için (local'de kullanılacak)
                        await RunFullScrape(stoppingToken);
                        break;
                    
                    case "index":
                        // Eksik vektörleri tamamla
                        await IndexMissingNovels(stoppingToken);
                        break;
                    
                    default:
                        _logger.LogWarning("⚠️ Bilinmeyen mode: {Mode}. 'fast' kullanılıyor.", mode);
                        await RunFastTrackOnce(stoppingToken);
                        break;
                }

                _logger.LogInformation("✅ Worker tamamlandı. Mode: {Mode}", mode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Worker hatası!");
            }
            finally
            {
                // GitHub Actions için: İş bitti, uygulamayı kapat
                _lifetime.StopApplication();
            }
        }

        /// <summary>
        /// FastTrack: En son güncellenenler sayfasından 5-10 sayfa tarar.
        /// Her 30 dakikada bir GitHub Actions tarafından çalıştırılır.
        /// </summary>
        private async Task RunFastTrackOnce(CancellationToken stoppingToken)
        {
            string url = _configuration["NovelFire:BaseUrlLatest"] ?? "https://novelfire.net/latest-release-novels";
            int pagesToScrape = int.Parse(_configuration["Scraper:FastTrackPages"] ?? "5");
            
            _logger.LogInformation("🚀 FastTrack başlatılıyor. URL: {Url}, Sayfa: {Pages}", url, pagesToScrape);
            
            await ScrapePages(url, pagesToScrape, "FastTrack", stoppingToken);
            
            // Son çalışma zamanını kaydet
            await SetScraperState(StateKeys.LastFastTrackRun, DateTime.UtcNow.ToString("O"));
            
            _logger.LogInformation("✅ FastTrack tamamlandı. {Pages} sayfa tarandı.", pagesToScrape);
        }

        /// <summary>
        /// SlowTrack: Tüm romanları tarar ama batch'ler halinde (her çalışmada 100 sayfa).
        /// State veritabanında tutulur, kaldığı yerden devam eder.
        /// </summary>
        private async Task RunSlowTrackBatch(CancellationToken stoppingToken)
        {
            string url = _configuration["NovelFire:BaseUrlPopular"] ?? "https://novelfire.net/genre-all/sort-popular/status-all/all-novel";
            int batchSize = int.Parse(_configuration["Scraper:SlowTrackBatchSize"] ?? "100");
            
            // State'den son kaldığımız sayfayı oku
            int currentPage = await GetScraperStateInt(StateKeys.SlowTrackPage, 1);
            int totalPages = await GetScraperStateInt(StateKeys.SlowTrackTotalPages, 0);
            
            // Toplam sayfa sayısını güncelle (ilk çalışmada veya periyodik olarak)
            if (totalPages == 0 || currentPage == 1)
            {
                totalPages = await GetTotalPages(url);
                await SetScraperState(StateKeys.SlowTrackTotalPages, totalPages.ToString());
            }

            _logger.LogInformation("🐢 SlowTrack başlatılıyor. Sayfa: {Current}/{Total}, Batch: {Batch}", 
                currentPage, totalPages, batchSize);
            
            int endPage = Math.Min(currentPage + batchSize - 1, totalPages);
            
            // Sayfaları tara
            await ScrapePagesRange(url, currentPage, endPage, "SlowTrack", stoppingToken);
            
            // State'i güncelle
            int nextPage = endPage + 1;
            if (nextPage > totalPages)
            {
                // Tüm liste tarandı, başa dön
                nextPage = 1;
                _logger.LogInformation("🔄 SlowTrack tamamlandı! Bir sonraki çalışmada baştan başlayacak.");
            }
            
            await SetScraperState(StateKeys.SlowTrackPage, nextPage.ToString());
            
            _logger.LogInformation("✅ SlowTrack batch tamamlandı. Sayfa {Start}-{End} tarandı. Sonraki: {Next}", 
                currentPage, endPage, nextPage);
        }

        /// <summary>
        /// Tüm listeyi baştan sona tarar. Local'de ilk kurulum için kullanılır.
        /// </summary>
        private async Task RunFullScrape(CancellationToken stoppingToken)
        {
            string url = _configuration["NovelFire:BaseUrlPopular"] ?? "https://novelfire.net/genre-all/sort-popular/status-all/all-novel";
            
            int totalPages = await GetTotalPages(url);
            _logger.LogInformation("📚 FULL SCRAPE başlatılıyor. Toplam {Total} sayfa taranacak...", totalPages);
            
            await ScrapePages(url, totalPages, "FullScrape", stoppingToken);
            
            // State'i sıfırla
            await SetScraperState(StateKeys.SlowTrackPage, "1");
            
            _logger.LogInformation("✅ FULL SCRAPE tamamlandı!");
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
                _logger.LogWarning("⚠️ Sayfa sayısı alınamadı: {Message}", ex.Message);
            }
            return 100; // Default fallback
        }

        private async Task ScrapePages(string baseUrl, int maxPages, string trackName, CancellationToken stoppingToken)
        {
            await ScrapePagesRange(baseUrl, 1, maxPages, trackName, stoppingToken);
        }

        private async Task ScrapePagesRange(string baseUrl, int startPage, int endPage, string trackName, CancellationToken stoppingToken)
        {
            for (int page = startPage; page <= endPage; page++)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // Stealth Mode: Random Jitter (her 10 sayfada mola)
                if (page > startPage && (page - startPage) % 10 == 0)
                {
                    int delay = Random.Shared.Next(45, 75);
                    _logger.LogInformation("[{Track}] ☕ Mola ({Delay}sn)...", trackName, delay);
                    await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken);
                }

                string separator = baseUrl.Contains("?") ? "&" : "?";
                string pageUrl = $"{baseUrl}{separator}page={page}";
                
                _logger.LogInformation("[{Track}] 📄 Sayfa {Page}/{End}", trackName, page, endPage);

                try 
                {
                    var listDoc = await FetchWithRetry(pageUrl);
                    var novelNodes = listDoc.DocumentNode.SelectNodes(XPaths.NovelListItems);
                    
                    if (novelNodes != null && novelNodes.Count > 0)
                    {
                        _logger.LogInformation("[{Track}] 📄 Sayfa {Page}: {Count} roman bulundu.", trackName, page, novelNodes.Count);
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            foreach (var node in novelNodes)
                            {
                                if (stoppingToken.IsCancellationRequested) break;
                                await ProcessNovelNode(node, dbContext, trackName);
                            }
                        }
                    }
                    else
                    {
                         // 🕵️ DEBUG: Roman bulunamadıysa sayfa içeriğini logla
                         _logger.LogWarning("[{Track}] ⚠️ Sayfa {Page}'de ROMAN BULUNAMADI! HTML Title: {Title}", 
                             trackName, page, listDoc.DocumentNode.SelectSingleNode("//title")?.InnerText.Trim());
                         
                         var htmlSample = listDoc.DocumentNode.OuterHtml;
                         if (htmlSample.Length > 500) htmlSample = htmlSample.Substring(0, 500);
                         _logger.LogWarning("[{Track}] HTML Sample: {Html}", trackName, htmlSample);
                    }
                }
                catch (Exception ex)
                {
                     _logger.LogError("Skip page {Page}: {Message}", page, ex.Message);
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
                _logger.LogWarning("[{Track}] Hata ({Title}): {Message}", trackName, title, ex.Message);
            }
        }

        // Exponential Backoff ile Hata Yönetimi
        private async Task<HtmlDocument> FetchWithRetry(string url)
        {
            int maxRetries = 3;
            int delay = 2000;

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
                        _logger.LogWarning("⚠️ {Status} Hatası. {Delay}sn bekleniyor...", response.StatusCode, delay/1000);
                        await Task.Delay(delay);
                        delay *= 2;
                    }
                    else
                    {
                        response.EnsureSuccessStatusCode(); 
                    }
                }
                catch (Exception ex) when (i < maxRetries - 1)
                {
                     _logger.LogWarning("⚠️ İstek Hatası: {Message}. Tekrar deneniyor...", ex.Message);
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
                NovelTags = allTags.Select(t => new NovelTag { Tag = new Tag { Name = t } }).ToList()
            };
        }

        private async Task SaveOrUpdateNovel(AppDbContext dbContext, Novel scrapedData, string trackName)
        {
            // Extract slug from SourceUrl (e.g., /book/shadow-slave -> shadow-slave)
            var slug = scrapedData.SourceUrl?.Split('/').LastOrDefault() ?? "";
            
            var dbNovel = await dbContext.Novels
                .Include(n => n.NovelTags)
                    .ThenInclude(nt => nt.Tag)
                .FirstOrDefaultAsync(n => n.SourceUrl == scrapedData.SourceUrl 
                                       || n.Title == scrapedData.Title 
                                       || n.Slug == slug);

            bool isNew = dbNovel == null;
            bool hasChanges = false;

            if (isNew)
            {
                dbNovel = new Novel
                {
                    Title = scrapedData.Title,
                    SourceUrl = scrapedData.SourceUrl!,
                    Author = scrapedData.Author,
                    Slug = slug, // Slug'ı SourceUrl'den çıkarılmış haliyle set et
                    NovelTags = new List<NovelTag>()
                };
                dbContext.Novels.Add(dbNovel);
            }

            bool isNewChapter = false;
            // Map simple fields
            if (dbNovel!.ViewCount != scrapedData.ViewCount) { dbNovel.ViewCount = scrapedData.ViewCount; hasChanges = true; }
            if (dbNovel.ChapterCount != scrapedData.ChapterCount) 
            { 
                if (scrapedData.ChapterCount > dbNovel.ChapterCount) isNewChapter = true;
                dbNovel.ChapterCount = scrapedData.ChapterCount; 
                hasChanges = true; 
            }
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
                        // Semantic Enrichment: Tags + Title + Summary
                        string tagString = scrapedData.NovelTags?.Any() == true 
                            ? string.Join(", ", scrapedData.NovelTags.Select(nt => nt.Tag.Name)) 
                            : "";
                        string enhancedText = $"Tags: {tagString}. Title: {scrapedData.Title}. Summary: {scrapedData.Description}";
                        
                        var newVector = await _embedder.EmbedAsync(enhancedText);
                        dbNovel.DescriptionEmbedding = new Vector(newVector);
                        _logger.LogInformation("✨ Vector updated with Enrichment: {Title}", dbNovel.Title);
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
                    // Semantic Enrichment for New Novels
                    string tagString = scrapedData.NovelTags?.Any() == true 
                        ? string.Join(", ", scrapedData.NovelTags.Select(nt => nt.Tag.Name)) 
                        : "";
                    string enhancedText = $"Tags: {tagString}. Title: {scrapedData.Title}. Summary: {scrapedData.Description}";

                    var newVector = await _embedder.EmbedAsync(enhancedText);
                    dbNovel.DescriptionEmbedding = new Vector(newVector);
                 } catch {}
            }

            // 🚀 BATCH TAG PROCESSING (N+1 Optimization)
            if (scrapedData.NovelTags != null && scrapedData.NovelTags.Any())
            {
                var inputTagNames = scrapedData.NovelTags.Select(nt => nt.Tag.Name).Distinct().ToList();
                
                var existingDbTags = (await dbContext.Tags
                    .Where(t => inputTagNames.Contains(t.Name))
                    .ToListAsync())
                    .GroupBy(t => t.Name)
                    .ToDictionary(g => g.Key, g => g.First());

                var newTags = new List<Tag>();
                foreach (var tagName in inputTagNames)
                {
                    if (!existingDbTags.ContainsKey(tagName))
                    {
                        var newTag = new Tag { Name = tagName };
                        newTags.Add(newTag);
                        existingDbTags[tagName] = newTag;
                    }
                }

                if (newTags.Any())
                {
                    dbContext.Tags.AddRange(newTags);
                }

                var currentTagIds = dbNovel.NovelTags.Select(nt => nt.TagId).ToHashSet();
                
                foreach (var tagName in inputTagNames)
                {
                    var tagEntity = existingDbTags[tagName];
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
                try 
                {
                    await dbContext.SaveChangesAsync();
                    _logger.LogInformation("[{Track}] {Status}: {Title}", trackName, isNew ? "🆕 NEW" : "💾 UPDATED", dbNovel.Title);

                    // 🔔 NOTIFICATIONS
                    if (isNew || isNewChapter) 
                    {
                        try 
                        {
                            var notifService = _serviceProvider.GetService<Novelytical.Services.FirebaseNotificationService>();
                            if (notifService != null)
                            {
                                string type = isNew ? "new_novel" : "new_chapter";
                                // Fire and forget notification to not block scraper
                                _ = notifService.NotifyNovelUpdateAsync(
                                    dbNovel.Author ?? "Unknown", 
                                    dbNovel.Title, 
                                    dbNovel.Id.ToString(), 
                                    dbNovel.CoverUrl ?? string.Empty, 
                                    type
                                ).ContinueWith(t => 
                                {
                                    if (t.IsFaulted) _logger.LogError(t.Exception, "Notification failed for {Title}", dbNovel.Title);
                                });
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error initiating notification");
                        }
                    }

                    // 🧹 CACHE INVALIDATION (Redis)
                    await _cache.RemoveAsync($"novel_details_{dbNovel.Id}");
                    if (!string.IsNullOrEmpty(dbNovel.Slug))
                    {
                        await _cache.RemoveAsync($"novel_details_{dbNovel.Slug.ToLower()}");
                    }
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505")
                {
                    // Duplicate key - novel already exists with this slug
                    // Detach and skip
                    _logger.LogWarning("[{Track}] ⏭️ DUPLICATE: {Title} (zaten mevcut, atlanıyor)", trackName, dbNovel.Title);
                    dbContext.Entry(dbNovel).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
                }
            }
            else
            {
                // _logger.LogInformation("[{Track}] ⏩ SKIP: {Title}", trackName, dbNovel.Title);
            }
        }

        private async Task IndexMissingNovels(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🔄 INDEX: Eksik vektörler kontrol ediliyor...");
            
            int totalProcessed = 0;
            
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    
                    var novels = await dbContext.Novels
                        .Include(n => n.NovelTags)
                            .ThenInclude(nt => nt.Tag)
                        .Where(n => !string.IsNullOrEmpty(n.Description) && n.DescriptionEmbedding == null)
                        .Take(100)
                        .ToListAsync(stoppingToken);

                    if (novels.Count == 0)
                    {
                        _logger.LogInformation("✅ Tüm romanların vektörleri tam. Toplam işlenen: {Count}", totalProcessed);
                        break;
                    }

                    _logger.LogInformation("⚠️ {Count} eksik vektör işleniyor...", novels.Count);

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
                            // Semantic Enrichment for Indexing
                            string tagString = novel.NovelTags?.Any() == true 
                                ? string.Join(", ", novel.NovelTags.Select(nt => nt.Tag.Name)) 
                                : "";
                            string enhancedText = $"Tags: {tagString}. Title: {novel.Title}. Summary: {novel.Description}";

                            var vector = await _embedder.EmbedAsync(enhancedText);
                            embeddingResults.Add((novel, new Vector(vector)));
                        }
                        catch (Exception ex)
                        {
                             _logger.LogError(ex, "Embedding failed ID: {Id}", novel.Id);
                        }
                    });

                    foreach(var result in embeddingResults)
                    {
                        var novel = result.Novel;
                        novel.DescriptionEmbedding = result.Vec;
                        dbContext.Entry(novel).State = EntityState.Modified;
                    }
                    
                    await dbContext.SaveChangesAsync(stoppingToken);
                    totalProcessed += embeddingResults.Count;
                    _logger.LogInformation("💾 Batch kaydedildi: {Count}", embeddingResults.Count);
                }
            }
        }

        #region State Yönetimi

        private async Task<string?> GetScraperState(string key)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var state = await dbContext.ScraperStates.FindAsync(key);
            return state?.Value;
        }

        private async Task<int> GetScraperStateInt(string key, int defaultValue)
        {
            var value = await GetScraperState(key);
            return int.TryParse(value, out int result) ? result : defaultValue;
        }

        private async Task SetScraperState(string key, string value)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var state = await dbContext.ScraperStates.FindAsync(key);
            
            if (state == null)
            {
                state = new ScraperState { Key = key, Value = value, UpdatedAt = DateTime.UtcNow };
                dbContext.ScraperStates.Add(state);
            }
            else
            {
                state.Value = value;
                state.UpdatedAt = DateTime.UtcNow;
            }
            
            await dbContext.SaveChangesAsync();
        }

        #endregion

        #region Helpers

        private string GetRandomUserAgent()
        {
            return _userAgents[Random.Shared.Next(_userAgents.Length)];
        }

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

        #endregion
    }
}