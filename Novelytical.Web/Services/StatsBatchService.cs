using System.Collections.Concurrent;
using Novelytical.Application.Interfaces;

namespace Novelytical.Web.Services;

public class StatsBatchService : IStatsBatchService
{
    // Use ConcurrentDictionary for thread-safe memory storage without locking manually
    private readonly ConcurrentDictionary<string, long> _pendingStats = new();
    
    private readonly IRedisService _redis;
    private readonly ILogger<StatsBatchService> _logger;
    
    // Redis key for tracking which stats have been modified today
    private const string ACTIVE_KEYS_SET = "stats:active_keys_today";

    public StatsBatchService(
        IRedisService redis, 
        ILogger<StatsBatchService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    /// <summary>
    /// Accumulate view increment in memory
    /// </summary>
    public void AccumulateView(int novelId)
    {
        var key = $"novel:{novelId}:site:views_today";
        _pendingStats.AddOrUpdate(key, 1, (_, current) => current + 1);
    }

    /// <summary>
    /// Accumulate comment increment in memory
    /// </summary>
    public void AccumulateComment(int novelId)
    {
        var key = $"novel:{novelId}:site:comments_today";
        _pendingStats.AddOrUpdate(key, 1, (_, current) => current + 1);
    }

    /// <summary>
    /// Accumulate review increment in memory
    /// </summary>
    public void AccumulateReview(int novelId)
    {
        var key = $"novel:{novelId}:site:reviews_today";
        _pendingStats.AddOrUpdate(key, 1, (_, current) => current + 1);
    }

    /// <summary>
    /// Flush all accumulated stats to Redis
    /// Called by Hangfire every 5 minutes
    /// </summary>
    public async Task FlushToRedis()
    {
        if (_pendingStats.IsEmpty)
        {
            return;
        }

        _logger.LogInformation("Flushing {Count} stats to Redis...", _pendingStats.Count);

        // Take a snapshot of current keys to process
        var snapshot = _pendingStats.ToArray();
        // Clear them from the main dictionary so new stats can come in
        foreach (var item in snapshot)
        {
            _pendingStats.TryRemove(item.Key, out _);
        }

        try
        {
            var tasks = new List<Task>();
            
            foreach (var item in snapshot)
            {
                var redisKey = item.Key;
                var value = item.Value;

                // 1. Increment the specific stat (e.g., novel:123:site:views_today)
                tasks.Add(_redis.IncrementAsync(redisKey, value));
                
                // 2. Add to the "Active Keys" set so the nightly job knows what to merge
                // optimization: we could probably do this less frequently, but doing it here ensures correctness
                tasks.Add(_redis.SetAddAsync(ACTIVE_KEYS_SET, redisKey));
            }

            await Task.WhenAll(tasks);
            
            _logger.LogInformation("Successfully flushed {Count} stats to Redis", snapshot.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to flush stats to Redis. Data may be lost if application restarts.");
            
            // Rescue strategy: Put them back? 
            // Better to just log. In a high-throughput system, occasional loss is acceptable vs blocking.
            // Or we could try to re-add them to _pendingStats, but that risks double counting if some succeeded.
        }
    }
}
