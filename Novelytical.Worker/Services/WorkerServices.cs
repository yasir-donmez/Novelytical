using Novelytical.Application.Interfaces;
using Novelytical.Application.DTOs;
using StackExchange.Redis;

namespace Novelytical.Worker.Services;

// 1. Worker RealTime Service (No-Op)
// Worker sunucu tarafında çalıştığı için client'lara (SignalR) bildirim atamaz.
public class WorkerRealTimeService : IRealTimeService
{
    private readonly ILogger<WorkerRealTimeService> _logger;

    public WorkerRealTimeService(ILogger<WorkerRealTimeService> logger)
    {
        _logger = logger;
    }

    public Task BroadcastNewPostAsync(CommunityPostDto post) => Task.CompletedTask;
    public Task BroadcastPollUpdateAsync(int postId, List<PollOptionDto> options) => Task.CompletedTask;
    public Task BroadcastPostDeletedAsync(int postId) => Task.CompletedTask;
    public Task BroadcastNewCommentAsync(PostCommentDto comment) => Task.CompletedTask;
    public Task BroadcastCommentDeletedAsync(int postId, int commentId) => Task.CompletedTask;
}

// 2. Worker Stats Batch Service (No-Op)
// Worker verileri doğrudan kaydettiği için "Batch Accumulation" yapmasına gerek yok.
public class WorkerStatsBatchService : IStatsBatchService
{
    private readonly ILogger<WorkerStatsBatchService> _logger;

    public WorkerStatsBatchService(ILogger<WorkerStatsBatchService> logger)
    {
        _logger = logger;
    }

    public void AccumulateView(int novelId) { }
    public void AccumulateComment(int novelId) { }
    public void AccumulateReview(int novelId) { }
    
    public Task FlushToRedis() => Task.CompletedTask;
}

// 3. Worker Redis Service (Full Implementation)
// Application katmanındaki bazı Handler'lar Redis'e ihtiyaç duyduğu için
// Web projesindeki RedisService'in aynısını burada implemente ediyoruz.
public class WorkerRedisService : IRedisService
{
    private readonly IDatabase _db;
    private readonly ILogger<WorkerRedisService> _logger;

    public WorkerRedisService(IConnectionMultiplexer redis, ILogger<WorkerRedisService> logger)
    {
        _db = redis.GetDatabase();
        _logger = logger;
    }

    public async Task IncrementAsync(string key, long value = 1)
    {
        try { await _db.StringIncrementAsync(key, value); }
        catch (Exception ex) { _logger.LogError(ex, "Redis IncrementAsync failed for key: {Key}", key); throw; }
    }

    public async Task<long> GetAsync(string key)
    {
        try 
        { 
            var value = await _db.StringGetAsync(key); 
            return value.HasValue ? (long)value : 0; 
        }
        catch (Exception ex) { _logger.LogError(ex, "Redis GetAsync failed for key: {Key}", key); return 0; }
    }

    public async Task<string?> GetStringAsync(string key)
    {
        try { return await _db.StringGetAsync(key); }
        catch (Exception ex) { _logger.LogError(ex, "Redis GetStringAsync failed for key: {Key}", key); return null; }
    }

    public async Task SetAsync(string key, long value, TimeSpan? expiry = null)
    {
        try { await _db.StringSetAsync(key, value, expiry); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SetAsync (long) failed for key: {Key}", key); throw; }
    }

    public async Task SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        try { await _db.StringSetAsync(key, value, expiry); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SetAsync (string) failed for key: {Key}", key); throw; }
    }

    public async Task DeleteAsync(string key)
    {
        try { await _db.KeyDeleteAsync(key); }
        catch (Exception ex) { _logger.LogError(ex, "Redis DeleteAsync failed for key: {Key}", key); throw; }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try { return await _db.KeyExistsAsync(key); }
        catch (Exception ex) { _logger.LogError(ex, "Redis ExistsAsync failed for key: {Key}", key); return false; }
    }

    // Set operations
    public async Task SetAddAsync(string key, string value)
    {
        try { await _db.SetAddAsync(key, value); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SetAddAsync failed for key: {Key}", key); throw; }
    }

    public async Task SetRemoveAsync(string key, string value)
    {
        try { await _db.SetRemoveAsync(key, value); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SetRemoveAsync failed for key: {Key}", key); throw; }
    }

    public async Task<string[]> SetMembersAsync(string key)
    {
        try 
        { 
            var members = await _db.SetMembersAsync(key);
            return members.Select(m => m.ToString()).ToArray();
        }
        catch (Exception ex) { _logger.LogError(ex, "Redis SetMembersAsync failed for key: {Key}", key); return Array.Empty<string>(); }
    }

    // List operations
    public async Task ListLeftPushAsync(string key, string value)
    {
        try { await _db.ListLeftPushAsync(key, value); }
        catch (Exception ex) { _logger.LogError(ex, "Redis ListLeftPushAsync failed for key: {Key}", key); throw; }
    }

    public async Task<string[]> ListRangeAsync(string key, long start, long stop)
    {
        try 
        { 
            var values = await _db.ListRangeAsync(key, start, stop);
            return values.Select(v => v.ToString()).ToArray();
        }
        catch (Exception ex) { _logger.LogError(ex, "Redis ListRangeAsync failed for key: {Key}", key); return Array.Empty<string>(); }
    }

    public async Task ListTrimAsync(string key, long start, long stop)
    {
        try { await _db.ListTrimAsync(key, start, stop); }
        catch (Exception ex) { _logger.LogError(ex, "Redis ListTrimAsync failed for key: {Key}", key); throw; }
    }

    // SortedSet operations
    public async Task SortedSetAddAsync(string key, string member, double score)
    {
        try { await _db.SortedSetAddAsync(key, member, score); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SortedSetAddAsync failed for key: {Key}", key); throw; }
    }

    public async Task<string[]> SortedSetRangeByRankAsync(string key, long start, long stop, bool descending = false)
    {
        try 
        { 
            var order = descending ? Order.Descending : Order.Ascending;
            var values = await _db.SortedSetRangeByRankAsync(key, start, stop, order);
            return values.Select(v => v.ToString()).ToArray();
        }
        catch (Exception ex) { _logger.LogError(ex, "Redis SortedSetRangeByRankAsync failed for key: {Key}", key); return Array.Empty<string>(); }
    }

    public async Task SortedSetRemoveRangeByRankAsync(string key, long start, long stop)
    {
        try { await _db.SortedSetRemoveRangeByRankAsync(key, start, stop); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SortedSetRemoveRangeByRankAsync failed for key: {Key}", key); throw; }
    }

    public async Task<long> SortedSetLengthAsync(string key)
    {
        try { return await _db.SortedSetLengthAsync(key); }
        catch (Exception ex) { _logger.LogError(ex, "Redis SortedSetLengthAsync failed for key: {Key}", key); return 0; }
    }
}
