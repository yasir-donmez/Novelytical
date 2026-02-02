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
    [HttpGet]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })] // Cache for 1 minute, vary by all query params
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

        // Logging simplified
        // Console.WriteLine($"[DEBUG] GetNovels: Search='{searchString}'");

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
    [HttpGet("{id}")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "id" })] // Cache details for 5 minutes
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
    [HttpGet("by-author")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "author", "excludeId" })]
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
    [HttpGet("{id:int}/similar")]
    [ResponseCache(Duration = 600, VaryByQueryKeys = new[] { "limit" })] // Similar novels rarely change
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
    [HttpGet("tags")]
    [ResponseCache(Duration = 3600)] // Tags change very rarely
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
        // View increment doesn't necessarily need to invalidate full detail cache immediately, 
        // as eventual consistency is acceptable for view counts.
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
        InvalidateNovelCache(id);
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
        InvalidateNovelCache(id);
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
        InvalidateNovelCache(id);
        return Ok();
    }

    private void InvalidateNovelCache(int id)
    {
        // Strategy: Short TTL Cache (Eventual Consistency)
        // We use [ResponseCache] with short durations (60s for lists, 300s for details) 
        // to balance load and freshness.
        // Active invalidation of ResponseCache middleware is complex and requires custom stores.
        // For this architecture, eventual consistency is acceptable.
        
        // Future: If strict consistency is needed, implement a custom IOutputCacheStore 
        // or move to manual distributed caching pattern.
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
