namespace Novelytical.Application.Interfaces;

public interface IRedisService
{
    Task IncrementAsync(string key, long value = 1);
    Task<long> GetAsync(string key);
    Task<string?> GetStringAsync(string key); 
    Task SetAsync(string key, long value, TimeSpan? expiry = null);
    Task SetAsync(string key, string value, TimeSpan? expiry = null); 
    Task DeleteAsync(string key);
    Task<bool> ExistsAsync(string key);
    
    // Set operations
    Task SetAddAsync(string key, string value);
    Task SetRemoveAsync(string key, string value);
    Task<string[]> SetMembersAsync(string key);
    
    // List operations
    Task ListLeftPushAsync(string key, string value);
    Task<string[]> ListRangeAsync(string key, long start, long stop);
    Task ListTrimAsync(string key, long start, long stop);
    
    // SortedSet operations
    Task SortedSetAddAsync(string key, string member, double score);
    Task<string[]> SortedSetRangeByRankAsync(string key, long start, long stop, bool descending = false);
    Task SortedSetRemoveRangeByRankAsync(string key, long start, long stop);
    Task<long> SortedSetLengthAsync(string key);
}
