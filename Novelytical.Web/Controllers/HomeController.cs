using System; // Math işlemleri için
using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // Veritabanı araçları
using Novelytical.Data; // Veri modellerimiz
using Novelytical.Web.Models;
using Pgvector.EntityFrameworkCore; // CosineDistance için gerekli

namespace Novelytical.Web.Controllers;

public class HomeController : Controller
{
    private readonly AppDbContext _context; // Veritabanı bağlantımız
    private readonly SmartComponents.LocalEmbeddings.LocalEmbedder _embedder; // Yapay Zeka

    // Garson (Controller) işe başlarken veritabanı anahtarını ve YZ modelini alıyor
    public HomeController(AppDbContext context, SmartComponents.LocalEmbeddings.LocalEmbedder embedder)
    {
        _context = context;
        _embedder = embedder;
    }

  // Parantez içine 'string searchString' ekledik. Arama kutusundan gelen yazı buraya düşecek.
    // sortOrder: Hangi sıraya göre dizileceği bilgisi
    // pageNumber: Hangi sayfadayız (Varsayılan 1)
    public async Task<IActionResult> Index(string searchString, string sortOrder, int pageNumber = 1)
    {
        // 1. Sıralama parametrelerini View'a taşı (ki butonlar aktif kalsın)
        ViewData["CurrentSort"] = sortOrder;
        ViewData["RatingSortParm"] = string.IsNullOrEmpty(sortOrder) ? "rating_asc" : "";
        ViewData["DateSortParm"] = sortOrder == "Date" ? "date_desc" : "Date";
        ViewData["ChapterSortParm"] = sortOrder == "Chapters" ? "chapters_desc" : "Chapters";
        ViewData["CurrentFilter"] = searchString; // Aramayı da hafızada tut

        // 2. Temel Sorgu
        var novelsQuery = _context.Novels
            .Include(n => n.NovelTags)
            .ThenInclude(nt => nt.Tag)
            .AsQueryable();

        // 3. 🧠 AKILLI ARAMA (Semantic Search)
        if (!string.IsNullOrEmpty(searchString))
        {
            // Kullanıcının yazdığı metni vektöre çevir
            var searchVector = _embedder.Embed(searchString);
            var searchVectorPg = new Pgvector.Vector(searchVector.Values.ToArray());

            // Veritabanında vektör benzerliğine göre sırala (En benzer en üstte)
            // CosineDistance: İki vektör arasındaki açı farkı. Sıfıra ne kadar yakınsa o kadar benzerdir.
            // Bu yüzden küçükten büyüğe sıralıyoruz (OrderBy)
            novelsQuery = novelsQuery
                .OrderBy(n => n.DescriptionEmbedding!.CosineDistance(searchVectorPg));
            
            // Eğer istersen: Hem benzerlik hem de klasik arama aynı anda olsun dersen 'Where' de ekleyebilirsin.
            // Ama şimdilik sadece benzerlik araması yapıyoruz, yani "anlam" olarak en yakını bulacak.
        }
        else
        {
            // 4. Standart Sıralama (Arama yoksa çalışır veya kullanıcı özel sıralama isterse)
             switch (sortOrder)
            {
                case "rating_lowest": // Puanı En Düşük
                    novelsQuery = novelsQuery.OrderBy(n => n.Rating);
                    break;
                case "chapters_desc": // En Çok Bölüm
                    novelsQuery = novelsQuery.OrderByDescending(n => n.ChapterCount);
                    break;
                case "date_desc": // Son Güncellenen
                    novelsQuery = novelsQuery.OrderByDescending(n => n.LastUpdated);
                    break;
                default: // Varsayılan: Puanı En Yüksek
                    novelsQuery = novelsQuery.OrderByDescending(n => n.Rating);
                    break;
            }
        }

        // 5. SAYFALAMA MEKANİZMASI (YENİ)
        int pageSize = 9; // Her sayfada 9 kitap olsun (3x3 güzel durur)
        int totalItems = await novelsQuery.CountAsync();
        int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
        
        // Sayfa numarası güvenliği (Eksiye veya sonsuza gitmesin)
        if (pageNumber < 1) pageNumber = 1;
        if (totalPages > 0 && pageNumber > totalPages) pageNumber = totalPages;

        var novels = await novelsQuery
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Sayfalama bilgisini View'a paketle
        ViewData["PageIndex"] = pageNumber;
        ViewData["TotalPages"] = totalPages;
        ViewData["HasPreviousPage"] = pageNumber > 1;
        ViewData["HasNextPage"] = pageNumber < totalPages;

        return View(novels);
    }
    // --- YENİ EKLENEN KISIM: DETAY SAYFASI ---
    public async Task<IActionResult> Details(int? id)
    {
        if (id == null) return NotFound(); // ID yoksa hata ver

        var novel = await _context.Novels
            .Include(n => n.NovelTags)
            .ThenInclude(nt => nt.Tag)
            .FirstOrDefaultAsync(m => m.Id == id); // ID'ye göre bul

        if (novel == null) return NotFound(); // Roman bulunamazsa hata ver

        return View(novel); // Romanı sayfaya gönder
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}