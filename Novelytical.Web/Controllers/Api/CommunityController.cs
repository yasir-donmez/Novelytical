using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Features.Community.Commands.AddPostComment;
using Novelytical.Application.Features.Community.Commands.CreatePost;
using Novelytical.Application.Features.Community.Commands.DeletePost;
using Novelytical.Application.Features.Community.Commands.DeletePostComment;
using Novelytical.Application.Features.Community.Commands.VotePost;
using Novelytical.Application.Features.Community.Queries.GetLatestPosts;
using Novelytical.Application.Features.Community.Queries.GetPostComments;
using Novelytical.Application.Features.Community.Queries.GetPostVoters;
using Novelytical.Application.Features.Community.Queries.GetUserPosts;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class CommunityController : ControllerBase
{
    private readonly IMediator _mediator;

    public CommunityController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var command = new CreatePostCommand
        {
            FirebaseUid = uid,
            Content = request.Content,
            Type = request.Type,
            RoomTitle = request.RoomTitle,
            DurationHours = request.DurationHours,
            Options = request.Options
        };

        var result = await _mediator.Send(command);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }

    [HttpGet]
    public async Task<IActionResult> GetLatestPosts([FromQuery] int take = 20)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var query = new GetLatestPostsQuery { FirebaseUid = uid, Take = take };
        var result = await _mediator.Send(query);
        return Ok(result.Data);
    }

    [HttpGet("user/{firebaseUid}")]
    public async Task<IActionResult> GetUserPosts(string firebaseUid)
    {
        var currentUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var query = new GetUserPostsQuery { CurrentFirebaseUid = currentUid, TargetFirebaseUid = firebaseUid };
        var result = await _mediator.Send(query);
        return Ok(result.Data);
    }

    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<IActionResult> Vote(int id, [FromBody] VoteRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var command = new VotePostCommand { FirebaseUid = uid, PostId = id, OptionId = request.OptionId };
        var result = await _mediator.Send(command);
        if (!result.Succeeded) return BadRequest(result.Message);
        
        return Ok(result.Data);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeletePost(int id)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var command = new DeletePostCommand { FirebaseUid = uid, PostId = id };
        var result = await _mediator.Send(command);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }
    
    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var query = new GetPostCommentsQuery { PostId = id };
        var result = await _mediator.Send(query);
        return Ok(result.Data);
    }

    [HttpPost("{id}/comments")]
    [Authorize]
    public async Task<IActionResult> AddComment(int id, [FromBody] AddPostCommentRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var command = new AddPostCommentCommand { FirebaseUid = uid, PostId = id, Content = request.Content };
        var result = await _mediator.Send(command);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }

    [HttpDelete("comments/{commentId}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var command = new DeletePostCommentCommand { FirebaseUid = uid, CommentId = commentId };
        var result = await _mediator.Send(command);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }
    
    [HttpGet("{id}/voters")]
    public async Task<IActionResult> GetVoters(int id)
    {
        var query = new GetPostVotersQuery { PostId = id };
        var result = await _mediator.Send(query);
        return Ok(result.Data);
    }
}


