using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using System.Security.Claims;
using Novelytical.Application.Features.Users.Queries.GetProfileByUid;
using Novelytical.Application.Features.Users.Commands.SyncUser;
using Novelytical.Application.Features.Users.Commands.UpdateProfile;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMyProfile()
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new GetProfileByUidQuery(uid));
        if (!result.Succeeded) return NotFound(result.Message);

        return Ok(result.Data);
    }

    [HttpPost("sync")]
    [Authorize]
    public async Task<IActionResult> SyncUser([FromBody] SyncUserRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new SyncUserCommand 
        { 
            Uid = uid, 
            Email = request.Email, 
            DisplayName = request.DisplayName, 
            AvatarUrl = request.AvatarUrl 
        });
        return Ok(result.Data);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _mediator.Send(new UpdateProfileCommand 
        { 
            Uid = uid, 
            DisplayName = request.DisplayName, 
            Bio = request.Bio, 
            AvatarUrl = request.AvatarUrl 
        });
        return Ok(result);
    }
}

public record SyncUserRequest(string? Email, string? DisplayName, string? AvatarUrl);
public record UpdateProfileRequest(string? DisplayName, string? Bio, string? AvatarUrl);
