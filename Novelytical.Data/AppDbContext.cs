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
        public DbSet<User> Users { get; set; }
        public DbSet<ScraperState> ScraperStates { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Çoka-çok ilişki için "Birleşik Anahtar" (Composite Key) tanımı
            // Yani bir roman ve etiket çifti sadece bir kez eşleşebilir.
            modelBuilder.Entity<NovelTag>()
                .HasKey(nt => new { nt.NovelId, nt.TagId });

            // ScraperState için Key alanını primary key olarak tanımla
            modelBuilder.Entity<ScraperState>()
                .HasKey(s => s.Key);

            // 🧠 Vektör eklentisini aktif et (Pgvector)
            modelBuilder.HasPostgresExtension("vector");

            // URL Slug'ları benzersiz olmalı
            modelBuilder.Entity<Novel>()
                .HasIndex(n => n.Slug)
                .IsUnique();
        }
    }
}