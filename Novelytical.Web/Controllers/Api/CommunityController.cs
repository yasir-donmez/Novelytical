using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class CommunityController : ControllerBase
{
    private readonly ICommunityService _communityService;

    public CommunityController(ICommunityService communityService)
    {
        _communityService = communityService;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _communityService.CreatePostAsync(uid, request);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }

    [HttpGet]
    public async Task<IActionResult> GetLatestPosts([FromQuery] int take = 20)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var result = await _communityService.GetLatestPostsAsync(uid, take);
        return Ok(result.Data);
    }

    [HttpGet("user/{firebaseUid}")]
    public async Task<IActionResult> GetUserPosts(string firebaseUid)
    {
        var currentUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var result = await _communityService.GetUserPostsAsync(currentUid ?? "", firebaseUid);
        return Ok(result.Data);
    }

    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<IActionResult> Vote(int id, [FromBody] VoteRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _communityService.VoteAsync(uid, id, request.OptionId);
        if (!result.Succeeded) return BadRequest(result.Message);
        
        return Ok(result.Data);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeletePost(int id)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _communityService.DeletePostAsync(uid, id);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }
    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var result = await _communityService.GetCommentsAsync(id);
        return Ok(result.Data);
    }

    [HttpPost("{id}/comments")]
    [Authorize]
    public async Task<IActionResult> AddComment(int id, [FromBody] AddPostCommentRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _communityService.AddCommentAsync(uid, id, request.Content);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }

    [HttpDelete("comments/{commentId}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _communityService.DeleteCommentAsync(uid, commentId);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }
    [HttpGet("{id}/voters")]
    public async Task<IActionResult> GetVoters(int id)
    {
        var result = await _communityService.GetVotersAsync(id);
        return Ok(result.Data);
    }
}

public class VoteRequest
{
    public int OptionId { get; set; }
}

public class AddPostCommentRequest
{
    public string Content { get; set; } = string.Empty;
}
