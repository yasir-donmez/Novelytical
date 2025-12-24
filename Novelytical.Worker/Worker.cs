using System.Text.RegularExpressions;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using Novelytical.Data;
using System.Net;
using Microsoft.Extensions.Configuration;

namespace Novelytical.Worker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        
        // private const string ListUrl = "https://www.royalroad.com/fictions/best-rated"; // Artık buradan okumuyoruz

        public Worker(ILogger<Worker> logger, IServiceProvider serviceProvider, IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("🧹 Robot V10 (Temizlikçi): Veriler toplanıyor ve metinler ütüleniyor...");

                try
                {
                    var web = new HtmlWeb();
                    web.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
                    
                    string listUrl = _configuration["RoyalRoadUrl"] ?? "https://www.royalroad.com/fictions/best-rated";
                    var listDoc = await web.LoadFromWebAsync(listUrl);
                    var novelNodes = listDoc.DocumentNode.SelectNodes("//div[contains(@class, 'fiction-list-item')]");

                    if (novelNodes != null)
                    {
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            
                            foreach (var node in novelNodes)
                            {
                                // --- 1. TEMEL BİLGİLER ---
                                var titleNode = node.SelectSingleNode(".//h2[contains(@class,'fiction-title')]/a");
                                var relativeUrl = titleNode?.GetAttributeValue("href", "");
                                var fullUrl = "https://www.royalroad.com" + relativeUrl;
                                var title = titleNode?.InnerText.Trim();

                                if (string.IsNullOrEmpty(fullUrl) || string.IsNullOrEmpty(title)) continue;

                                var ratingNode = node.SelectSingleNode(".//div[contains(@aria-label, 'Rating:')]");
                                decimal rating = ParseRating(ratingNode?.GetAttributeValue("aria-label", ""));
                                
                                var chapterNode = node.SelectSingleNode(".//i[contains(@class, 'fa-list')]/parent::div");
                                int chapterCount = ParseChapters(chapterNode?.InnerText);

                                // --- 2. ETİKETLERİ (TAGS) BUL ---
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

                                // --- 3. DETAYLARI AL (İçeri Gir) ---
                                _logger.LogInformation($"➡️ İşleniyor: {title}");
                                
                                var detailDoc = await web.LoadFromWebAsync(fullUrl);
                                var detailNode = detailDoc.DocumentNode;

                                var authorNode = detailNode.SelectSingleNode("//h4//a") ?? detailNode.SelectSingleNode("//span[@property='name']");
                                var author = authorNode?.InnerText.Trim() ?? "Bilinmeyen";

                                // Özet kısmını temizle (YENİ FONKSİYON KULLANILIYOR)
                                var descNode = detailNode.SelectSingleNode("//div[contains(@class, 'description')]");
                                var description = CleanText(descNode?.InnerHtml); // InnerHtml alıyoruz ki <br> etiketlerini görelim

                                var imgNode = detailNode.SelectSingleNode("//img[contains(@class, 'thumbnail')]");
                                var coverUrl = imgNode?.GetAttributeValue("src", "");


                                // --- 4. VERİTABANI İŞLEMLERİ ---
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
                                        Description = "",
                                        CoverUrl = "",
                                        NovelTags = new List<NovelTag>()
                                    };
                                    dbContext.Novels.Add(novel);
                                }

                                novel.Author = author ?? "Bilinmeyen";
                                novel.Description = description; // Temizlenmiş metni kaydet
                                novel.CoverUrl = coverUrl ?? "";
                                novel.Rating = rating;
                                novel.ChapterCount = chapterCount;
                                novel.LastUpdated = DateTime.UtcNow;

                                await dbContext.SaveChangesAsync();

                                // --- 5. ETİKETLERİ KAYDET VE BAĞLA ---
                                foreach (var tagName in tagsList)
                                {
                                    var tag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name == tagName);
                                    if (tag == null)
                                    {
                                        tag = new Tag { Name = tagName };
                                        dbContext.Tags.Add(tag);
                                        await dbContext.SaveChangesAsync();
                                    }

                                    var exists = await dbContext.NovelTags.AnyAsync(nt => nt.NovelId == novel.Id && nt.TagId == tag.Id);
                                    if (!exists)
                                    {
                                        dbContext.NovelTags.Add(new NovelTag { NovelId = novel.Id, TagId = tag.Id });
                                    }
                                }
                                await dbContext.SaveChangesAsync();

                                _logger.LogInformation($"✅ GÜNCELLENDİ: {title} (Özet temizlendi)");
                                await Task.Delay(1000); 
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Hata oluştu!");
                }

                _logger.LogInformation("💤 Robot dinleniyor...");
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        // --- YENİ GELİŞMİŞ TEMİZLİK FONKSİYONU ---
        private string CleanText(string? text)
        {
            if (string.IsNullOrEmpty(text)) return "Özet Yok";

            // 1. HTML Karakterlerini Çöz (&amp; -> &)
            string clean = WebUtility.HtmlDecode(text);

            // 2. <br> ve <p> gibi etiketleri BOŞLUĞA çevir (Kelimeler yapışmasın diye)
            clean = clean.Replace("<br>", " ")
                         .Replace("<br/>", " ")
                         .Replace("<br />", " ")
                         .Replace("<p>", " ")
                         .Replace("</p>", " ")
                         .Replace("<div>", " ")
                         .Replace("</div>", " ");

            // 3. Kalan tüm HTML etiketlerini (<a>, <b> vb.) sil
            clean = Regex.Replace(clean, @"<[^>]+>", "");

            // 4. Görünmez karakterleri (Tab, Satır sonu) sil
            clean = Regex.Replace(clean, @"\t|\n|\r", " ");

            // 5. Çift boşlukları teke indir
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
                if (decimal.TryParse(num, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out decimal result))
                    return result;
            }
            return 0;
        }

        private int ParseChapters(string? text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            var match = Regex.Match(text, @"(\d+)\s+Chapters");
            if (match.Success && int.TryParse(match.Groups[1].Value, out int count))
                return count;
            return 0;
        }
    }
}