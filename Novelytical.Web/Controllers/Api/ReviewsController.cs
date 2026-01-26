using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Interfaces;
using Novelytical.Application.DTOs;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpPost("comment")]
    [Authorize]
    public async Task<IActionResult> AddComment([FromBody] AddCommentRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var commentRequest = new CommentRequest 
        { 
            Content = request.Content, 
            IsSpoiler = request.IsSpoiler,
            ParentId = request.ParentId
        };

        var result = await _reviewService.AddCommentAsync(uid, request.NovelId, commentRequest);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpPost("review")]
    [Authorize]
    public async Task<IActionResult> AddReview([FromBody] AddReviewRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var reviewRequest = new ReviewRequest
        {
            Content = request.Content,
            IsSpoiler = request.IsSpoiler,
            RatingOverall = request.RatingOverall,
            RatingStory = request.RatingStory,
            RatingCharacters = request.RatingCharacters,
            RatingWorld = request.RatingWorld,
            RatingFlow = request.RatingFlow,
            RatingGrammar = request.RatingGrammar
        };

        var result = await _reviewService.AddReviewAsync(uid, request.NovelId, reviewRequest);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpGet("novel/{novelId}/comments")]
    public async Task<IActionResult> GetComments(int novelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _reviewService.GetCommentsAsync(novelId, page, pageSize);
        return Ok(result.Data);
    }

    [HttpGet("novel/{novelId}/reviews")]
    public async Task<IActionResult> GetReviews(int novelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
        var result = await _reviewService.GetReviewsAsync(novelId, page, pageSize);
        return Ok(result.Data);
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestReviews([FromQuery] int count = 5)
    {
        var result = await _reviewService.GetLatestReviewsAsync(count);
        return Ok(result.Data);
    }

    [HttpGet("user/{firebaseUid}/comments")]
    public async Task<IActionResult> GetCommentsByUser(string firebaseUid)
    {
        var result = await _reviewService.GetCommentsByUserIdAsync(firebaseUid);
        return Ok(result.Data);
    }

    [HttpGet("user/{firebaseUid}/reviews")]
    public async Task<IActionResult> GetReviewsByUser(string firebaseUid)
    {
        var result = await _reviewService.GetReviewsByUserIdAsync(firebaseUid);
        return Ok(result.Data);
    }

    [HttpPost("comment/{id}/reaction")]
    [Authorize]
    public async Task<IActionResult> ToggleCommentReaction(int id, [FromBody] ReactionRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _reviewService.ToggleCommentReactionAsync(uid, id, request.ReactionType);
        return Ok(result.Data);
    }

    [HttpPost("review/{id}/reaction")]
    [Authorize]
    public async Task<IActionResult> ToggleReviewReaction(int id, [FromBody] ReactionRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _reviewService.ToggleReviewReactionAsync(uid, id, request.ReactionType);
        return Ok(result.Data);
    }

    [HttpPost("comments/reactions")]
    [Authorize]
    public async Task<IActionResult> GetCommentReactions([FromBody] List<int> ids)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _reviewService.GetUserCommentReactionsAsync(uid, ids);
        return Ok(result.Data);
    }

    [HttpPost("reviews/reactions")]
    [Authorize]
    public async Task<IActionResult> GetReviewReactions([FromBody] List<int> ids)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _reviewService.GetUserReviewReactionsAsync(uid, ids);
        return Ok(result.Data);
    }
    [HttpDelete("comment/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(int id)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _reviewService.DeleteCommentAsync(uid, id);
        return Ok(result);
    }

    [HttpDelete("review/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _reviewService.DeleteReviewAsync(uid, id);
        return Ok(result);
    }

    [HttpPut("review/{novelId}")]
    [Authorize]
    public async Task<IActionResult> UpdateReview(int novelId, [FromBody] AddReviewRequest request)
    {
        // This is essentially same as AddReview because AddReview handles upsert
        return await AddReview(request);
    }
}

public record AddCommentRequest(int NovelId, string Content, bool IsSpoiler, int? ParentId = null);
public record AddReviewRequest(
    int NovelId, 
    string Content, 
    bool IsSpoiler,
    double RatingOverall,
    double RatingStory,
    double RatingCharacters,
    double RatingWorld,
    double RatingFlow,
    double RatingGrammar
);

public record ReactionRequest(int ReactionType);
