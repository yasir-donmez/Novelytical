namespace Novelytical.Data
{
    public class Novel
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty; // Roman Başlığı
        public string? Author { get; set; } // Yazar (Boş olabilir)
        public string? Description { get; set; } // Özet
        public string? CoverUrl { get; set; } // Kapak Resmi Linki
        public string SourceUrl { get; set; } = string.Empty; // Kaynak Linki (Zorunlu)
        public decimal Rating { get; set; } // Puan
        public int ChapterCount { get; set; } // Bölüm Sayısı
        public DateTime LastUpdated { get; set; } // Son Güncelleme Tarihi

        // İlişkiler: Bir romanın birden fazla etiketi olabilir
        public List<NovelTag> NovelTags { get; set; } = new();
    }
}