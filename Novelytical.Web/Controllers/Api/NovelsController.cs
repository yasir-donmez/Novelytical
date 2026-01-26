using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Novelytical;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Microsoft.Extensions.Caching.Memory;

using MediatR;
using Novelytical.Application.Features.Novels.Queries.GetNovelById;
using Novelytical.Application.Features.Novels.Queries.GetNovels;
using Novelytical.Application.Features.Novels.Queries.GetNovelsByAuthor;
using Novelytical.Application.Features.Novels.Queries.GetSimilarNovels;
using Novelytical.Application.Features.Novels.Queries.GetAllTags;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class NovelsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly Data.Interfaces.INovelRepository _novelRepository;

    public NovelsController(
        IMediator mediator, 
        Data.Interfaces.INovelRepository novelRepository,
        IRedisService redisService,
        Microsoft.Extensions.Caching.Memory.IMemoryCache memoryCache)
    {
        _mediator = mediator;
        _novelRepository = novelRepository;
        _redisService = redisService;
        _memoryCache = memoryCache;
    }

    private readonly IRedisService _redisService;
    private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _memoryCache;

    /// <summary>
    /// Get paginated list of novels with optional search and sorting
    /// </summary>
    /// <param name="searchString">Search query for semantic search</param>
    /// <param name="tag">Filter by tag (case-insensitive)</param>
    /// <param name="sortOrder">Sort order (rating_asc, chapters_desc, date_desc)</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 9)</param>
    /// <returns>Paginated list of novels</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetNovels(
        [FromQuery] string? searchString,
        [FromQuery(Name = "tag")] List<string>? tags,
        [FromQuery] string? sortOrder,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 9,
        [FromQuery] int? minChapters = null,
        [FromQuery] int? maxChapters = null,
        [FromQuery] decimal? minRating = null,
        [FromQuery] decimal? maxRating = null)
    {
        if (pageNumber < 1 || pageSize < 1)
            return BadRequest("Page number and page size must be greater than 0");

        // Special handling for Ranking System (Redis)
        // Only use if fetching generic list (no search/filter)
        /*
        if (sortOrder == "rank_desc" && string.IsNullOrEmpty(searchString) && (tags == null || tags.Count == 0))
        {
            try 
            {
                var cacheKey = $"novels_rank_desc_{pageNumber}_{pageSize}";
                PagedResponse<NovelDto>? cachedResult = null;

                if (_memoryCache.TryGetValue(cacheKey, out object? rawResult) && rawResult is PagedResponse<NovelDto> typedResult)
                {
                    cachedResult = typedResult;
                }
                else
                {
                    // Not in memory, fetch from Redis
                    var start = (pageNumber - 1) * pageSize;
                    var end = start + pageSize - 1;
                    
                    var novelIds = await _redisService.SortedSetRangeByRankAsync("novels:rankings", start, end, descending: true);
                    
                    if (novelIds.Any())
                    {
                        var ids = novelIds.Select(id => int.TryParse(id, out var i) ? i : 0).Where(i => i > 0).ToList();
                        
                        var tasks = ids.Select(id => _mediator.Send(new GetNovelByIdQuery(id.ToString())));
                        var results = await Task.WhenAll(tasks);
                        
                        List<NovelDto> novels = results
                            .Where(r => r.Succeeded && r.Data != null)
                            .Select(r => r.Data!)
                            .ToList();
                            
                        var totalCount = await _redisService.SortedSetLengthAsync("novels:rankings");
                        
                        cachedResult = new PagedResponse<NovelDto>(novels, pageNumber, pageSize, (int)totalCount);
                        
                        // Save to Memory Cache for 5 minutes
                        _memoryCache.Set(cacheKey, cachedResult, TimeSpan.FromMinutes(5));
                    }
                }
                
                if (cachedResult != null)
                {
                    return Ok(cachedResult);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Redis fetch failed: {ex.Message}. Falling back to DB.");
            }
        }
        */

        Console.WriteLine($"[DEBUG] GetNovels: Search='{searchString}', Tags='{string.Join(",", tags ?? new List<string>())}'");

        var query = new GetNovelsQuery
        {
            SearchString = searchString,
            Tags = tags,
            SortOrder = sortOrder,
            PageNumber = pageNumber,
            PageSize = pageSize,
            MinChapters = minChapters,
            MaxChapters = maxChapters,
            MinRating = minRating,
            MaxRating = maxRating
        };

        var result = await _mediator.Send(query);

        if (!result.Succeeded)
            return BadRequest(result.Message);

        return Ok(result);
    }

    /// <summary>
    /// Get novel details by ID or Slug
    /// </summary>
    /// <param name="id">Novel ID or Slug</param>
    /// <returns>Novel details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNovel(string id)
    {
        var result = await _mediator.Send(new GetNovelByIdQuery(id));

        if (!result.Succeeded)
            return NotFound(result.Message);

        return Ok(result);
    }

    /// <summary>
    /// Get novels by the same author
    /// </summary>
    /// <param name="author">Author name</param>
    /// <param name="excludeId">Novel ID to exclude (typically the current novel)</param>
    /// <param name="pageSize">Number of novels to return (default: 6)</param>
    /// <returns>List of novels by author</returns>
    [HttpGet("by-author")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNovelsByAuthor(
        [FromQuery] string author,
        [FromQuery] int excludeId = 0,
        [FromQuery] int pageSize = 6)
    {
        if (string.IsNullOrWhiteSpace(author))
            return BadRequest("Author name is required");

        var result = await _mediator.Send(new GetNovelsByAuthorQuery { Author = author, ExcludeId = excludeId, PageSize = pageSize });

        if (!result.Succeeded)
            return BadRequest(result.Message);

        return Ok(result);
    }

    /// <summary>
    /// Get AI-powered similar novels based on description embeddings
    /// </summary>
    /// <param name="id">Novel ID</param>
    /// <param name="limit">Number of similar novels to return (default: 6)</param>
    /// <returns>List of similar novels</returns>
    [HttpGet("{id:int}/similar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSimilarNovels(int id, [FromQuery] int limit = 12)
    {
        var result = await _mediator.Send(new GetSimilarNovelsQuery(id, limit));

        if (!result.Succeeded)
            return BadRequest(result.Message);

        return Ok(result);
    }

    /// <summary>
    /// Get all available tags for filtering
    /// </summary>
    /// <returns>List of tag names</returns>
    [HttpGet("tags")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTags()
    {
        var result = await _mediator.Send(new GetAllTagsQuery());
        return Ok(result);
    }


    /// <summary>
    /// Increment site-specific view count
    /// </summary>
    [HttpPost("{id}/view")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> IncrementView(int id)
    {
        await _mediator.Send(new global::Novelytical.Application.Features.Novels.Commands.UpdateStats.IncrementSiteViewCommand { NovelId = id });
        return Ok();
    }

    /// <summary>
    /// Update comment count (sync from Firestore)
    /// </summary>
    [HttpPost("{id}/comment-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateCommentCount(int id, [FromBody] int count)
    {
        await _mediator.Send(new global::Novelytical.Application.Features.Novels.Commands.UpdateStats.UpdateCommentCountCommand { NovelId = id, Count = count });
        return Ok();
    }

    /// <summary>
    /// Update review count and average rating (sync from Firestore)
    /// </summary>
    [HttpPost("{id}/review-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateReviewCount(int id, [FromBody] UpdateReviewStatsRequest request)
    {
        await _mediator.Send(new global::Novelytical.Application.Features.Novels.Commands.UpdateStats.UpdateReviewCountCommand 
        { 
            NovelId = id, 
            Count = request.Count,
            AverageRating = request.AverageRating,
            RatingStory = request.RatingStory,
            RatingCharacters = request.RatingCharacters,
            RatingWorld = request.RatingWorld,
            RatingFlow = request.RatingFlow,
            RatingGrammar = request.RatingGrammar
        });
        return Ok();
    }
    /// <summary>
    /// Update library count (sync from Firestore)
    /// </summary>
    [HttpPost("{id}/library-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateLibraryCount(int id, [FromBody] int count)
    {
        await _mediator.Send(new global::Novelytical.Application.Features.Novels.Commands.UpdateStats.UpdateLibraryCountCommand { NovelId = id, Count = count });
        return Ok();
    }
}

public record UpdateReviewStatsRequest(
    int Count, 
    double? AverageRating,
    double? RatingStory,
    double? RatingCharacters,
    double? RatingWorld,
    double? RatingFlow,
    double? RatingGrammar
);
