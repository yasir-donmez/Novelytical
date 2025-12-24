using System.Text.RegularExpressions;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using Novelytical.Data;
using System.Net;
using SmartComponents.LocalEmbeddings; // <-- YENİ KÜTÜPHANE
using Pgvector; // <-- VEKTÖR İÇİN

namespace Novelytical.Worker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceProvider _serviceProvider;
        
        // Yapay Zeka Çevirmeni (Embedder)
        // Bu arkadaş metinleri 384 tane sayıya çevirecek.
        private readonly LocalEmbedder _embedder = new LocalEmbedder();

        private const string BaseUrl = "https://www.royalroad.com/fictions/best-rated";

        public Worker(ILogger<Worker> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("🧠 Robot V12 (AI Modu): Vektörler hesaplanıyor...");

                try
                {
                    var web = new HtmlWeb();
                    web.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
                    
                    int maxPages = 5; // Test için 5 sayfa (100 Roman) yeterli. İstersen 50 yap.

                    for (int page = 1; page <= maxPages; page++)
                    {
                        if (stoppingToken.IsCancellationRequested) break;

                        string pageUrl = $"{BaseUrl}?page={page}";
                        _logger.LogInformation($"📄 SAYFA TARANIYOR: {page} / {maxPages}");

                        var listDoc = await web.LoadFromWebAsync(pageUrl);
                        var novelNodes = listDoc.DocumentNode.SelectNodes("//div[contains(@class, 'fiction-list-item')]");

                        if (novelNodes != null)
                        {
                            using (var scope = _serviceProvider.CreateScope())
                            {
                                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                
                                foreach (var node in novelNodes)
                                {
                                    if (stoppingToken.IsCancellationRequested) break;

                                    // --- BİLGİLERİ TOPLA ---
                                    var titleNode = node.SelectSingleNode(".//h2[contains(@class,'fiction-title')]/a");
                                    var relativeUrl = titleNode?.GetAttributeValue("href", "");
                                    var fullUrl = "https://www.royalroad.com" + relativeUrl;
                                    var title = titleNode?.InnerText.Trim();

                                    if (string.IsNullOrEmpty(fullUrl) || string.IsNullOrEmpty(title)) continue;

                                    // ... Diğer basit veriler ...
                                    var ratingNode = node.SelectSingleNode(".//div[contains(@aria-label, 'Rating:')]");
                                    decimal rating = ParseRating(ratingNode?.GetAttributeValue("aria-label", ""));
                                    
                                    var chapterNode = node.SelectSingleNode(".//i[contains(@class, 'fa-list')]/parent::div");
                                    int chapterCount = ParseChapters(chapterNode?.InnerText);

                                    // Etiketler
                                    var tagNodes = node.SelectNodes(".//a[contains(@class, 'fiction-tag')]");
                                    var tagsList = new List<string>();
                                    if (tagNodes != null)
                                    {
                                        foreach (var t in tagNodes)
                                        {
                                            var tagName = t.InnerText.Trim();
                                            if (!string.IsNullOrEmpty(tagName)) tagsList.Add(tagName);
                                        }
                                    }
                                    
                                    // Detay Sayfası
                                    var detailDoc = await web.LoadFromWebAsync(fullUrl);
                                    var detailNode = detailDoc.DocumentNode;
                                    
                                    var authorNode = detailNode.SelectSingleNode("//h4//a") ?? detailNode.SelectSingleNode("//span[@property='name']");
                                    var author = authorNode?.InnerText.Trim() ?? "Bilinmeyen";

                                    var descNode = detailNode.SelectSingleNode("//div[contains(@class, 'description')]");
                                    string rawDescription = descNode?.InnerHtml;
                                    string cleanDescription = CleanText(rawDescription); // Temizlenmiş Metin

                                    // --- 🧠 KRİTİK NOKTA: VEKTÖR HESAPLAMA ---
                                    // Temiz metni al, yapay zekaya ver, sayı dizisi al.
                                    Vector? embeddingVector = null;
                                    if (!string.IsNullOrEmpty(cleanDescription))
                                    {
                                        // Embedder metni okur ve float[] dizisi verir
                                        var embeddingResult = _embedder.Embed(cleanDescription);
                                        
                                        // Biz bunu Neon veritabanının anlayacağı 'Vector' türüne çeviriyoruz
                                        embeddingVector = new Vector(embeddingResult.Values.ToArray());
                                    }

                                    // --- VERİTABANI KAYIT ---
                                    var novel = await dbContext.Novels
                                        .Include(n => n.NovelTags)
                                        .FirstOrDefaultAsync(n => n.SourceUrl == fullUrl);

                                    if (novel == null)
                                    {
                                        novel = new Novel
                                        {
                                            Title = title ?? "Başlıksız",
                                            SourceUrl = fullUrl,
                                            Author = "Ekleniyor...",
                                            NovelTags = new List<NovelTag>()
                                        };
                                        dbContext.Novels.Add(novel);
                                    }

                                    // Verileri Güncelle
                                    novel.Author = author ?? "Bilinmeyen";
                                    novel.Description = cleanDescription;
                                    novel.Rating = rating;
                                    novel.ChapterCount = chapterCount;
                                    novel.LastUpdated = DateTime.UtcNow;
                                    
                                    // Resim
                                    var imgNode = detailNode.SelectSingleNode("//img[contains(@class, 'thumbnail')]");
                                    novel.CoverUrl = imgNode?.GetAttributeValue("src", "") ?? "";

                                    // 🧠 Vektörü Kaydet (En önemlisi bu!)
                                    novel.DescriptionEmbedding = embeddingVector;

                                    await dbContext.SaveChangesAsync();

                                    // Etiket Bağlantıları (Standart prosedür)
                                    foreach (var tagName in tagsList)
                                    {
                                        var tag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name == tagName);
                                        if (tag == null) { tag = new Tag { Name = tagName }; dbContext.Tags.Add(tag); await dbContext.SaveChangesAsync(); }

                                        if (!await dbContext.NovelTags.AnyAsync(nt => nt.NovelId == novel.Id && nt.TagId == tag.Id))
                                        {
                                            dbContext.NovelTags.Add(new NovelTag { NovelId = novel.Id, TagId = tag.Id });
                                        }
                                    }
                                    await dbContext.SaveChangesAsync();

                                    _logger.LogInformation($"✅ KAYDEDİLDİ: {title} (Vektör Boyutu: {embeddingVector?.ToString().Length ?? 0})");
                                    await Task.Delay(500); // Hızlı geçelim
                                }
                            }
                        }
                    }
                    
                    _logger.LogInformation("💤 Tüm sayfalar bitti. Robot dinleniyor...");
                    await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Hata oluştu!");
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
            }
        }

        private string CleanText(string? text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            string clean = WebUtility.HtmlDecode(text);
            clean = clean.Replace("<br>", " ").Replace("<p>", " ").Replace("</p>", " ");
            clean = Regex.Replace(clean, @"<[^>]+>", "");
            clean = Regex.Replace(clean, @"\s+", " ").Trim();
            return clean;
        }

        private decimal ParseRating(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            var match = Regex.Match(text, @"([\d\.,]+)\s*out");
            if (match.Success)
            {
                string num = match.Groups[1].Value.Replace(",", ".");
                if (decimal.TryParse(num, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out decimal result)) return result;
            }
            return 0;
        }

        private int ParseChapters(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            var match = Regex.Match(text, @"(\d+)\s+Chapters");
            if (match.Success && int.TryParse(match.Groups[1].Value, out int count)) return count;
            return 0;
        }
    }
}