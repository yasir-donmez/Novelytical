using Novelytical.Application.DTOs;
using Novelytical.Data;
using Microsoft.EntityFrameworkCore;

namespace Novelytical.Web.Services;

public class RankingService
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;
    private readonly ILogger<RankingService> _logger;

    public RankingService(
        AppDbContext db,
        IRedisService redis,
        ILogger<RankingService> logger)
    {
        _db = db;
        _redis = redis;
        _logger = logger;
    }

    /// <summary>
    /// Calculate total rank score for a novel combining Scraped Data and Site Data
    /// Formula: (ScrapedViews / 10000) + SiteViews + (SiteComments * 20) + (SiteReviews * 50)
    /// </summary>
    public async Task<int> CalculateRankScore(int novelId, Novel? novel = null)
    {
        // 1. Fetch novel if not provided
        if (novel == null)
        {
            novel = await _db.Novels.FindAsync(novelId);
            if (novel == null) return 0;
        }

        // 2. Calculate using the central formula
        return GetScoreFromNovel(novel);
    }

    /// <summary>
    /// Pure calculation logic using Postgres data
    /// </summary>
    public int GetScoreFromNovel(Novel novel)
    {
        // Scraped Score: Normalize external huge numbers (e.g. 10M views -> 1000 points)
        var scrapedScore = (int)Math.Floor((double)novel.ViewCount / 10000.0);
        
        // Site Score: Real-time user interactions from Postgres columns
        var siteViewScore = novel.SiteViewCount;
        var commentScore = novel.CommentCount * 20;
        var reviewScore = novel.ReviewCount * 50;

        return scrapedScore + siteViewScore + commentScore + reviewScore;
    }
}
