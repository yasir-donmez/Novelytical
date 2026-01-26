using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace Novelytical.Application.Features.Authors.Queries.GetTopAuthors;

public class GetTopAuthorsQuery : IRequest<Response<AuthorsRankResponse>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 30;
}

public class AuthorsRankResponse
{
    public IEnumerable<object> Authors { get; set; }
    public string? MaxScore { get; set; }
    public long TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class GetTopAuthorsQueryHandler : IRequestHandler<GetTopAuthorsQuery, Response<AuthorsRankResponse>>
{
    private readonly IRedisService _redis;
    private readonly IMemoryCache _memoryCache;

    public GetTopAuthorsQueryHandler(IRedisService redis, IMemoryCache memoryCache)
    {
        _redis = redis;
        _memoryCache = memoryCache;
    }

    public async Task<Response<AuthorsRankResponse>> Handle(GetTopAuthorsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"authors_rank_page_{request.Page}_{request.PageSize}";
        
        if (_memoryCache.TryGetValue(cacheKey, out AuthorsRankResponse? cachedResponse))
        {
             if (cachedResponse != null) return new Response<AuthorsRankResponse>(cachedResponse);
        }

        var start = (request.Page - 1) * request.PageSize;
        var end = start + request.PageSize - 1;
        
        // 1. Get sorted list of authors (Names)
        var authorNames = await _redis.SortedSetRangeByRankAsync(
            "authors:rankings",
            start,
            end,
            descending: true
        );
        
        var maxScore = await _redis.GetStringAsync("rankings:max_score");
        
        // 2. Fetch details for each author
        var tasks = authorNames.Select(async name => 
        {
            var json = await _redis.GetStringAsync($"author:{name}:details");
            if (!string.IsNullOrEmpty(json))
            {
                try 
                {
                    return JsonSerializer.Deserialize<object>(json);
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

        var response = new AuthorsRankResponse {
            Authors = results.Where(r => r != null),
            MaxScore = maxScore,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
        
        // Cache the response object for 5 minutes
        _memoryCache.Set(cacheKey, response, TimeSpan.FromMinutes(5));

        return new Response<AuthorsRankResponse>(response);
    }
}
