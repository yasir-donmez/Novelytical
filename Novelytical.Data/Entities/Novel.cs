using System.ComponentModel.DataAnnotations.Schema;
using Pgvector; // Bu kütüphane şart!
using NpgsqlTypes; // PostgreSQL tsvector için

namespace Novelytical.Data
{
    public class Novel
    {
        // --- 1. Identity & Basic Info ---
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Author { get; set; }
        public string Slug { get; set; } = string.Empty; // URL-friendly ID
        public string? Description { get; set; }
        public string? CoverUrl { get; set; }
        public string? DominantColor { get; set; } // Hex Color (e.g. #FF5500)
        public string SourceUrl { get; set; } = string.Empty;
        
        // --- 2. Content Details ---
        public string Status { get; set; } = "Unknown"; // Ongoing / Completed
        public int ChapterCount { get; set; }
        public DateTime LastUpdated { get; set; }
        public List<NovelTag> NovelTags { get; set; } = new();

        // --- 3. Ratings (Detailed) ---
        public decimal Rating { get; set; } // Overall Average
        
        public decimal RatingStory { get; set; }
        public decimal RatingCharacters { get; set; }
        public decimal RatingWorld { get; set; }
        public decimal RatingFlow { get; set; }
        public decimal RatingGrammar { get; set; }

        public decimal? ScrapedRating { get; set; } // Legacy/External

        // --- 4. Statistics ---
        public int ViewCount { get; set; } // Scraped/Total View
        public int SiteViewCount { get; set; } // Internal View
        public int CommentCount { get; set; }
        public int ReviewCount { get; set; }
        public int LibraryCount { get; set; }
        public int TotalRankScore { get; set; }

        // --- 5. System / Search (Postgres Vectors) ---
        
        // vector(384) -> Standard size for embeddings
        [Column(TypeName = "vector(384)")] 
        public Vector? DescriptionEmbedding { get; set; }

        // tsvector -> Full-Text Search
        [Column(TypeName = "tsvector")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public NpgsqlTsVector? SearchVector { get; set; }
    }
}
