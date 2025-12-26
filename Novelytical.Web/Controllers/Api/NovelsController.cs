using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Interfaces;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class NovelsController : ControllerBase
{
    private readonly INovelService _novelService;

    public NovelsController(INovelService novelService)
    {
        _novelService = novelService;
    }

    /// <summary>
    /// Get paginated list of novels with optional search and sorting
    /// </summary>
    /// <param name="searchString">Search query for semantic search</param>
    /// <param name="sortOrder">Sort order (rating_asc, chapters_desc, date_desc)</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 9)</param>
    /// <returns>Paginated list of novels</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetNovels(
        [FromQuery] string? searchString,
        [FromQuery] string? sortOrder,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 9)
    {
        if (pageNumber < 1 || pageSize < 1)
            return BadRequest("Page number and page size must be greater than 0");

        var result = await _novelService.GetNovelsAsync(searchString, sortOrder, pageNumber, pageSize);

        if (!result.Succeeded)
            return BadRequest(result.Message);

        return Ok(result);
    }

    /// <summary>
    /// Get novel details by ID
    /// </summary>
    /// <param name="id">Novel ID</param>
    /// <returns>Novel details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNovel(int id)
    {
        var result = await _novelService.GetNovelByIdAsync(id);

        if (!result.Succeeded)
            return NotFound(result.Message);

        return Ok(result);
    }
}
