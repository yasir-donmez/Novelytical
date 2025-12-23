using Microsoft.EntityFrameworkCore;

namespace Novelytical.Data
{
    public class AppDbContext : DbContext
    {
        // Veritabanı ayarlarını dışarıdan (Web projesinden) almamızı sağlayan yapı
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Tabloları sisteme tanıtıyoruz
        public DbSet<Novel> Novels { get; set; }
        public DbSet<Tag> Tags { get; set; }
        public DbSet<NovelTag> NovelTags { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Çoka-çok ilişki için "Birleşik Anahtar" (Composite Key) tanımı
            // Yani bir roman ve etiket çifti sadece bir kez eşleşebilir.
            modelBuilder.Entity<NovelTag>()
                .HasKey(nt => new { nt.NovelId, nt.TagId });
        }
    }
}