using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Novelytical.Application.Features.Library.Commands.AddOrUpdateLibrary;
using Novelytical.Application.Features.Library.Queries.GetNovelStatus;
using Novelytical.Application.Features.Library.Queries.GetUserLibrary;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class LibraryController : ControllerBase
{
    private readonly IMediator _mediator;

    public LibraryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> AddOrUpdateLibrary([FromBody] AddLibraryRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var command = new AddOrUpdateLibraryCommand
        {
            FirebaseUid = uid,
            NovelId = request.NovelId,
            Status = request.Status,
            CurrentChapter = request.CurrentChapter
        };

        var result = await _mediator.Send(command);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetMyLibrary()
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var query = new GetUserLibraryQuery { TargetUserId = uid, RequesterUserId = uid };
        var result = await _mediator.Send(query);
        
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }

    [HttpGet("{targetUserId}")]
    public async Task<IActionResult> GetUserLibrary(string targetUserId)
    {
        var requesterId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var query = new GetUserLibraryQuery { TargetUserId = targetUserId, RequesterUserId = requesterId };
        var result = await _mediator.Send(query);
        
        if (!result.Succeeded) 
        {
            if (result.Message.Contains("gizli") || result.Message.Contains("takip"))
                return StatusCode(403, new { message = result.Message });
                
            return BadRequest(new { message = result.Message });
        }

        return Ok(result.Data);
    }

    [HttpGet("{novelId}/status")]
    [Authorize]
    public async Task<IActionResult> GetNovelStatus(int novelId)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var query = new GetNovelStatusQuery { FirebaseUid = uid, NovelId = novelId };
        var result = await _mediator.Send(query);
        
        return Ok(new { status = result.Data });
    }
}

public record AddLibraryRequest(int NovelId, int Status, int? CurrentChapter = null);
