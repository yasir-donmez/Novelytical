using Novelytical.Data;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Novelytical.Web.Services;

namespace Novelytical.Web.Jobs;

public class UpdateRankingsJob
{
    private readonly AppDbContext _db;
    private readonly RankingService _rankingService;
    private readonly IRedisService _redis;
    private readonly ILogger<UpdateRankingsJob> _logger;

    public UpdateRankingsJob(
        AppDbContext db,
        RankingService rankingService,
        IRedisService redis,
        ILogger<UpdateRankingsJob> logger)
    {
        _db = db;
        _rankingService = rankingService;
        _redis = redis;
        _logger = logger;
    }

    public async Task Execute()
    {
        _logger.LogInformation("Starting hourly rankings update...");
        
        try
        {
            // 1. Fetch all novels metadata
            // AsNoTracking for performance as we read-only
            var novels = await _db.Novels.AsNoTracking().ToListAsync();
            
            _logger.LogInformation("Calculating scores for {Count} novels...", novels.Count);

            var scores = new Dictionary<int, int>();
            
            // 2. Calculate scores for all novels
            // Can be parallelized? Context is not thread-safe, so loop sequentially or use factories.
            // Sequential is fine for ~1000 novels.
            foreach (var novel in novels)
            {
                var score = await _rankingService.CalculateRankScore(novel.Id, novel);
                scores[novel.Id] = score;
            }

            // 3. Update Novel Rankings (for individual novel lookups)
            // We can store top list or just cache individual scores
            // Let's store individual scores for fast lookup
            foreach (var kvp in scores)
            {
                await _redis.SetAsync($"novel:{kvp.Key}:rank_score", kvp.Value, TimeSpan.FromHours(2));
                // Add to Global Novel Rankings Sorted Set
                await _redis.SortedSetAddAsync("novels:rankings", kvp.Key.ToString(), kvp.Value);
            }
            // Set expire for the sorted set
            // await _redis.KeyExpireAsync("novels:rankings", TimeSpan.FromHours(2)); 
            // Note: KeyExpire on a sorted set deletes the whole set. We might want to keep it persistent or just refresh it.
            // Since we overwrite scores, it stays fresh.
            
            // 4. Aggregate Author Scores
            var authorScores = novels
                .GroupBy(n => n.Author)
                .Select(g => new {
                    Author = g.Key,
                    TotalScore = g.Sum(n => scores.GetValueOrDefault(n.Id, 0)),
                    BookCount = g.Count(),
                    TopNovel = g.OrderByDescending(n => scores.GetValueOrDefault(n.Id, 0)).FirstOrDefault()
                })
                .OrderByDescending(x => x.TotalScore)
                .ToList();

            _logger.LogInformation("Calculated scores for {Count} authors", authorScores.Count);

            // 5. Update Redis Sorted Set for Authors
            // "authors:rankings" -> Member: AuthorName, Score: TotalScore
            
            // Clear existing first (or just overwrite? SortedSetAdd updates existing)
            // But if an author dropped out? Better to just update.
            // ZADD updates score if member exists.
            
            // 5. Update Redis Sorted Set & Details for Authors
            foreach (var author in authorScores)
            {
                if (string.IsNullOrEmpty(author.Author)) continue;
                
                // Add to Sorted Set (Ranking)
                await _redis.SortedSetAddAsync("authors:rankings", author.Author, author.TotalScore);
                
                // Cache Details (JSON) for rich display
                var details = new
                {
                    Name = author.Author,
                    Count = author.BookCount,
                    TotalChapters = novels.Where(n => n.Author == author.Author).Sum(n => n.ChapterCount), // Re-calc or agg above
                    TotalRankScore = author.TotalScore,
                    TopNovels = novels
                        .Where(n => n.Author == author.Author)
                        .OrderByDescending(n => scores.GetValueOrDefault(n.Id, 0))
                        .Take(3)
                        .Select(n => new { 
                            CoverUrl = n.CoverUrl, 
                            RankScore = scores.GetValueOrDefault(n.Id, 0)
                        })
                        .ToList()
                };
                
                var jsonOptions = new System.Text.Json.JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase 
                };
                var json = System.Text.Json.JsonSerializer.Serialize(details, jsonOptions);
                await _redis.SetAsync($"author:{author.Author}:details", json, TimeSpan.FromHours(2));
            }
            
            // Cache max score for frontend progress bars
            if (authorScores.Any())
            {
                var maxScore = authorScores.Max(a => a.TotalScore);
                await _redis.SetAsync("rankings:max_score", maxScore);
            }

            _logger.LogInformation("Rankings update completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update rankings");
            throw; // Let Hangfire retry
        }
    }
}
