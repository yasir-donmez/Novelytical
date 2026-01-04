using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Novels.Queries.GetAllTags;

public class GetAllTagsQueryHandler : IRequestHandler<GetAllTagsQuery, Response<List<string>>>
{
    private readonly INovelRepository _repository;
    private readonly IMemoryCache _cache;

    public GetAllTagsQueryHandler(INovelRepository repository, IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Response<List<string>>> Handle(GetAllTagsQuery request, CancellationToken cancellationToken)
    {
        string cacheKey = "all_tags";
        if (_cache.TryGetValue(cacheKey, out List<string>? cachedTags) && cachedTags != null)
        {
            return new Response<List<string>>(cachedTags);
        }

        var tags = await _repository.GetAllTagsAsync();
        var tagNames = tags.Select(t => t.Name).ToList();

        // Cache for 1 hour
        _cache.Set(cacheKey, tagNames, TimeSpan.FromHours(1));

        return new Response<List<string>>(tagNames);
    }
}
