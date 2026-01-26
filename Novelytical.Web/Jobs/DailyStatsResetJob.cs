using Novelytical.Data;
using Novelytical.Web.Services;
using Microsoft.EntityFrameworkCore;

namespace Novelytical.Web.Jobs;

public class DailyStatsResetJob
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;
    private readonly ILogger<DailyStatsResetJob> _logger;
    private const string ACTIVE_KEYS_SET = "stats:active_keys_today";

    public DailyStatsResetJob(AppDbContext db, IRedisService redis, ILogger<DailyStatsResetJob> logger)
    {
        _db = db;
        _redis = redis;
        _logger = logger;
    }

    public async Task Execute()
    {
        _logger.LogInformation("Starting daily stats reset job (Sync Redis -> DB)...");

        try
        {
            // 1. Get all keys that were active today
            var activeKeys = await _redis.SetMembersAsync(ACTIVE_KEYS_SET);
            
            if (!activeKeys.Any())
            {
                _logger.LogInformation("No active keys found for today. Skipping reset.");
                return;
            }

            _logger.LogInformation("Found {Count} active keys to process.", activeKeys.Length);

            var viewUpdates = new Dictionary<int, long>();
            var processedKeys = new List<string>();

            // 2. Aggregate views from Redis
            foreach (var key in activeKeys)
            {
                // Key format: novel:{id}:site:views_today
                if (!key.EndsWith(":site:views_today")) continue;

                if (LoadNovelIdFromKey(key, out int novelId))
                {
                    var value = await _redis.GetAsync(key);
                    if (value > 0)
                    {
                        if (viewUpdates.ContainsKey(novelId))
                            viewUpdates[novelId] += value;
                        else
                            viewUpdates[novelId] = value;
                    }
                    processedKeys.Add(key);
                }
            }

            // 3. Bulk Update Database (Batched)
            if (viewUpdates.Any())
            {
                _logger.LogInformation("Syncing {Count} novels to database...", viewUpdates.Count);

                foreach (var (novelId, views) in viewUpdates)
                {
                    // Direct ExecuteUpdate is more efficient than loading entities
                    await _db.Novels
                        .Where(n => n.Id == novelId)
                        .ExecuteUpdateAsync(s => s.SetProperty(n => n.SiteViewCount, n => n.SiteViewCount + (int)views));
                }
            }

            // 4. Cleanup Redis
            // Remove processed content keys
            foreach (var key in processedKeys)
            {
                await _redis.DeleteAsync(key);
            }
            
            // Remove Active Keys Set
            await _redis.DeleteAsync(ACTIVE_KEYS_SET);

            _logger.LogInformation("Daily stats reset completed. Synced {Count} novels.", viewUpdates.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute daily stats reset job");
            // Do not throw, we don't want to crash the job runner repeatedly if it's a transient DB issue, 
            // but for data safety, maybe we should? Hangfire handles retries.
            throw; 
        }
    }

    private bool LoadNovelIdFromKey(string key, out int novelId)
    {
        novelId = 0;
        try 
        {
            // novel:123:site:views_today
            var parts = key.Split(':');
            if (parts.Length >= 2 && parts[0] == "novel" && int.TryParse(parts[1], out int id))
            {
                novelId = id;
                return true;
            }
        }
        catch {}
        return false;
    }
}
