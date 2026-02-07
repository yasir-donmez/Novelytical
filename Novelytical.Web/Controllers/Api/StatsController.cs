using Microsoft.AspNetCore.Mvc;
using Novelytical.Web.Services;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly StatsBatchService _statsBatch;
    private readonly ILogger<StatsController> _logger;

    public StatsController(StatsBatchService statsBatch, ILogger<StatsController> logger)
    {
        _statsBatch = statsBatch;
        _logger = logger;
    }

    /// <summary>
    /// Increment novel view count (Memory accumulation - 0 Redis/Firebase writes)
    /// </summary>
    [HttpPost("novels/{id}/view")]
    public IActionResult IncrementView(int id)
    {
        try
        {
            _statsBatch.AccumulateView(id);
            return Ok(new { success = true, message = "View accumulated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to accumulate view for novel {NovelId}", id);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Increment comment count (Memory accumulation)
    /// </summary>
    [HttpPost("novels/{id}/comment")]
    public IActionResult IncrementComment(int id)
    {
        try
        {
            _statsBatch.AccumulateComment(id);
            return Ok(new { success = true, message = "Comment count accumulated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to accumulate comment for novel {NovelId}", id);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Increment review count (Memory accumulation)
    /// </summary>
    [HttpPost("novels/{id}/review")]
    public IActionResult IncrementReview(int id)
    {
        try
        {
            _statsBatch.AccumulateReview(id);
            return Ok(new { success = true, message = "Review count accumulated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to accumulate review for novel {NovelId}", id);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }
}
