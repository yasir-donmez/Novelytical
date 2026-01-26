using Microsoft.AspNetCore.Mvc;
using Novelytical.Web.Services;
using StackExchange.Redis;
using Microsoft.Extensions.Caching.Memory;

namespace Novelytical.Web.Controllers;

[ApiController]
[Route("api/authors")]
public class AuthorsController : ControllerBase
{
    private readonly IRedisService _redis;
    
    private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _memoryCache;
    
    public AuthorsController(IRedisService redis, Microsoft.Extensions.Caching.Memory.IMemoryCache memoryCache)
    {
        _redis = redis;
        _memoryCache = memoryCache;
    }

    [HttpGet("top")]
    public async Task<IActionResult> GetTopAuthors(int page = 1, int pageSize = 30)
    {
        var cacheKey = $"authors_rank_page_{page}_{pageSize}";
        
        if (_memoryCache.TryGetValue(cacheKey, out object? cachedResponse))
        {
            return Ok(cachedResponse);
        }

        var start = (page - 1) * pageSize;
        var end = start + pageSize - 1;
        
        // 1. Get sorted list of authors (Names)
        var authorNames = await _redis.SortedSetRangeByRankAsync(
            "authors:rankings",
            start,
            end,
            descending: true
        );
        
        var maxScore = await _redis.GetAsync("rankings:max_score");
        
        // 2. Fetch details for each author
        var tasks = authorNames.Select(async name => 
        {
            var json = await _redis.GetStringAsync($"author:{name}:details");
            if (!string.IsNullOrEmpty(json))
            {
                try 
                {
                    return System.Text.Json.JsonSerializer.Deserialize<object>(json);
                }
                catch
                {
                    return new { Name = name, TotalRankScore = 0 }; 
                }
            }
            return new { Name = name, TotalRankScore = 0 };
        });

        var results = await Task.WhenAll(tasks);
        
        // Get total count for pagination
        var totalCount = await _redis.SortedSetLengthAsync("authors:rankings");

        var response = new {
            authors = results.Where(r => r != null),
            maxScore = maxScore,
            totalCount = totalCount,
            page,
            pageSize
        };
        
        // Cache the response object for 5 minutes
        _memoryCache.Set(cacheKey, response, TimeSpan.FromMinutes(5));

        return Ok(response);
    }
}
