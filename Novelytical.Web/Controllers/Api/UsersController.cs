using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Interfaces;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMyProfile()
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _userService.GetProfileByUidAsync(uid);
        if (!result.Succeeded) return NotFound(result.Message);

        return Ok(result.Data);
    }

    [HttpPost("sync")]
    [Authorize]
    public async Task<IActionResult> SyncUser([FromBody] SyncUserRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _userService.SyncUserAsync(uid, request.Email, request.DisplayName, request.AvatarUrl);
        return Ok(result.Data);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _userService.UpdateProfileAsync(uid, request.DisplayName, request.Bio, request.AvatarUrl);
        return Ok(result);
    }
}

public record SyncUserRequest(string? Email, string? DisplayName, string? AvatarUrl);
public record UpdateProfileRequest(string? DisplayName, string? Bio, string? AvatarUrl);
