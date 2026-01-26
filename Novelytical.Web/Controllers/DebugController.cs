using Microsoft.AspNetCore.Mvc;
using Novelytical.Data;
using Microsoft.EntityFrameworkCore;
using Novelytical.Web.Services;

namespace Novelytical.Web.Controllers;

[ApiController]
[Route("api/debug")]
public class DebugController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public DebugController(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    [HttpGet("check")]
    public async Task<IActionResult> CheckSystem()
    {
        var novelCount = await _db.Novels.CountAsync();
        var authorRankingCount = await _redis.SortedSetLengthAsync("authors:rankings");
        
        // Check first 5 authors
        var topAuthors = await _redis.SortedSetRangeByRankAsync("authors:rankings", 0, 4, descending: true);
        var maxScore = await _redis.GetAsync("rankings:max_score");
        
        return Ok(new 
        { 
            DbNovelCount = novelCount, 
            RedisAuthorCount = authorRankingCount,
            RedisMaxScore = maxScore, 
            TopAuthorsInRedis = topAuthors,
            Message = novelCount == 0 ? "DB is empty! Run seed?" : "DB has data."
        });
    }

    [HttpPost("trigger-job")]
    public IActionResult Trigger()
    {
        Hangfire.RecurringJob.Trigger("update-rankings");
        return Ok("Job triggered. Check logs.");
    }
}
