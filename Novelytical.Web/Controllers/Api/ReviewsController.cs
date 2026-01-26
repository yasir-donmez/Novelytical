using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using System.Security.Claims;
using Novelytical.Application.Features.Reviews.Commands.AddComment;
using Novelytical.Application.Features.Reviews.Commands.AddReview;
using Novelytical.Application.Features.Reviews.Queries.GetComments;
using Novelytical.Application.Features.Reviews.Queries.GetReviews;
using Novelytical.Application.Features.Reviews.Queries.GetLatestReviews;
using Novelytical.Application.Features.Reviews.Queries.GetCommentsByUser;
using Novelytical.Application.Features.Reviews.Queries.GetReviewsByUser;
using Novelytical.Application.Features.Reviews.Commands.ToggleCommentReaction;
using Novelytical.Application.Features.Reviews.Commands.ToggleReviewReaction;
using Novelytical.Application.Features.Reviews.Queries.GetUserCommentReactions;
using Novelytical.Application.Features.Reviews.Queries.GetUserReviewReactions;
using Novelytical.Application.Features.Reviews.Commands.DeleteComment;
using Novelytical.Application.Features.Reviews.Commands.DeleteReview;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReviewsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("comment")]
    [Authorize]
    public async Task<IActionResult> AddComment([FromBody] AddCommentRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new AddCommentCommand
        {
            FirebaseUid = uid,
            NovelId = request.NovelId,
            Content = request.Content,
            IsSpoiler = request.IsSpoiler,
            ParentId = request.ParentId
        });

        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpPost("review")]
    [Authorize]
    public async Task<IActionResult> AddReview([FromBody] AddReviewRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new AddReviewCommand
        {
            FirebaseUid = uid,
            NovelId = request.NovelId,
            Content = request.Content,
            IsSpoiler = request.IsSpoiler,
            RatingOverall = request.RatingOverall,
            RatingStory = request.RatingStory,
            RatingCharacters = request.RatingCharacters,
            RatingWorld = request.RatingWorld,
            RatingFlow = request.RatingFlow,
            RatingGrammar = request.RatingGrammar
        });

        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpGet("novel/{novelId}/comments")]
    public async Task<IActionResult> GetComments(int novelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetCommentsQuery { NovelId = novelId, Page = page, PageSize = pageSize });
        return Ok(result.Data);
    }

    [HttpGet("novel/{novelId}/reviews")]
    public async Task<IActionResult> GetReviews(int novelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
        var result = await _mediator.Send(new GetReviewsQuery { NovelId = novelId, Page = page, PageSize = pageSize });
        return Ok(result.Data);
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestReviews([FromQuery] int count = 5)
    {
        var result = await _mediator.Send(new GetLatestReviewsQuery { Count = count });
        return Ok(result.Data);
    }

    [HttpGet("user/{firebaseUid}/comments")]
    public async Task<IActionResult> GetCommentsByUser(string firebaseUid)
    {
        var result = await _mediator.Send(new GetCommentsByUserQuery { FirebaseUid = firebaseUid });
        return Ok(result.Data);
    }

    [HttpGet("user/{firebaseUid}/reviews")]
    public async Task<IActionResult> GetReviewsByUser(string firebaseUid)
    {
        var result = await _mediator.Send(new GetReviewsByUserQuery { FirebaseUid = firebaseUid });
        return Ok(result.Data);
    }

    [HttpPost("comment/{id}/reaction")]
    [Authorize]
    public async Task<IActionResult> ToggleCommentReaction(int id, [FromBody] ReactionRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new ToggleCommentReactionCommand 
        { 
            FirebaseUid = uid, 
            CommentId = id, 
            ReactionType = request.ReactionType 
        });
        return Ok(result.Data);
    }

    [HttpPost("review/{id}/reaction")]
    [Authorize]
    public async Task<IActionResult> ToggleReviewReaction(int id, [FromBody] ReactionRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new ToggleReviewReactionCommand
        {
            FirebaseUid = uid,
            ReviewId = id,
            ReactionType = request.ReactionType
        });
        return Ok(result.Data);
    }

    [HttpPost("comments/reactions")]
    [Authorize]
    public async Task<IActionResult> GetCommentReactions([FromBody] List<int> ids)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new GetUserCommentReactionsQuery { FirebaseUid = uid, CommentIds = ids });
        return Ok(result.Data);
    }

    [HttpPost("reviews/reactions")]
    [Authorize]
    public async Task<IActionResult> GetReviewReactions([FromBody] List<int> ids)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new GetUserReviewReactionsQuery { FirebaseUid = uid, ReviewIds = ids });
        return Ok(result.Data);
    }
    
    [HttpDelete("comment/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(int id)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new DeleteCommentCommand { FirebaseUid = uid, CommentId = id });
        return Ok(result);
    }

    [HttpDelete("review/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new DeleteReviewCommand { FirebaseUid = uid, ReviewId = id });
        return Ok(result);
    }

    [HttpPut("review/{novelId}")]
    [Authorize]
    public async Task<IActionResult> UpdateReview(int novelId, [FromBody] AddReviewRequest request)
    {
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
