using System.ComponentModel.DataAnnotations.Schema;
using Pgvector; // Bu kütüphane şart!

namespace Novelytical.Data
{
    public class Novel
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Author { get; set; }
        public string? Description { get; set; }
        public string? CoverUrl { get; set; }
        public string SourceUrl { get; set; } = string.Empty;
        public decimal Rating { get; set; }
        public int ChapterCount { get; set; }
        public DateTime LastUpdated { get; set; }

        // --- YENİ: VEKTÖR KUTUSU ---
        // vector(384) -> Ücretsiz modeller için standart boyuttur.
        [Column(TypeName = "vector(384)")] 
        public Vector? DescriptionEmbedding { get; set; } 

        public List<NovelTag> NovelTags { get; set; } = new();
    }
}