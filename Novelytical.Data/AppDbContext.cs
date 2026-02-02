using Microsoft.EntityFrameworkCore;
using Novelytical.Data.Entities;

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
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ScraperState> ScraperStates { get; set; }
        public DbSet<UserLibrary> UserLibraries { get; set; }
        public DbSet<CommentReaction> CommentReactions { get; set; }
        public DbSet<ReviewReaction> ReviewReactions { get; set; }
        
        public DbSet<PostComment> PostComments { get; set; }
        public DbSet<CommunityPost> CommunityPosts { get; set; }
        public DbSet<PollOption> PollOptions { get; set; }
        public DbSet<PollVote> PollVotes { get; set; }

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

            // Kütüphane: Bir kullanıcı bir romanı sadece bir kez ekleyebilir
            modelBuilder.Entity<UserLibrary>()
                .HasIndex(ul => new { ul.UserId, ul.NovelId })
                .IsUnique();

            // Reaction Constraints: Bir kullanıcı bir yoruma/incelemeye tek tepki verebilir
            modelBuilder.Entity<CommentReaction>()
                .HasIndex(cr => new { cr.UserId, cr.CommentId })
                .IsUnique();

            modelBuilder.Entity<ReviewReaction>()
                .HasIndex(rr => new { rr.UserId, rr.ReviewId })
                .IsUnique();
            // 🚀 Performance Improvements: Indexing for Sort & Filter
            
            // Novels: Used for "Latest Updates"
            modelBuilder.Entity<Novel>()
                .HasIndex(n => n.LastUpdated);

            // Novels: Used for "Top Rated"
            modelBuilder.Entity<Novel>()
                .HasIndex(n => n.Rating);

            // Novels: Used for filtering by Status
            modelBuilder.Entity<Novel>()
                .HasIndex(n => n.Status);

            // Community: Feed sorting
            modelBuilder.Entity<CommunityPost>()
                .HasIndex(p => p.CreatedAt);
            
            // Reviews: Filter by Novel
            modelBuilder.Entity<Review>()
                .HasIndex(r => r.NovelId);

            // 🔍 Composite Index: Status + Rating (Common filter usage)
            modelBuilder.Entity<Novel>()
                .HasIndex(n => new { n.Status, n.Rating });
        }
    }
}