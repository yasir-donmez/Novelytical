using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Features.Users.Commands.FollowUser;
using Novelytical.Application.Features.Users.Commands.UnfollowUser;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/users/{userId}/follow")]
[Authorize]
public class FollowController : ControllerBase
{
    private readonly IMediator _mediator;

    public FollowController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> FollowUser(string userId)
    {
        var currentUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUid)) return Unauthorized();

        var result = await _mediator.Send(new FollowUserCommand 
        { 
            FollowerUid = currentUid, 
            FollowingUid = userId 
        });

        if (!result.Succeeded) return BadRequest(new { message = result.Message });

        return Ok(result);
    }

    [HttpDelete]
    public async Task<IActionResult> UnfollowUser(string userId)
    {
        var currentUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUid)) return Unauthorized();

        var result = await _mediator.Send(new UnfollowUserCommand 
        { 
            FollowerUid = currentUid, 
            FollowingUid = userId 
        });

        if (!result.Succeeded) return BadRequest(new { message = result.Message });

        return Ok(result);
    }
}
