using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Interfaces;
using Novelytical.Data;
using System.Security.Claims;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class LibraryController : ControllerBase
{
    private readonly ILibraryService _libraryService;

    public LibraryController(ILibraryService libraryService)
    {
        _libraryService = libraryService;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> AddOrUpdateLibrary([FromBody] AddLibraryRequest request)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _libraryService.AddOrUpdateAsync(uid, request.NovelId, request.Status, request.CurrentChapter);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetMyLibrary()
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _libraryService.GetUserLibraryAsync(uid);
        if (!result.Succeeded) return BadRequest(result.Message);

        return Ok(result.Data);
    }

    [HttpGet("{novelId}/status")]
    [Authorize]
    public async Task<IActionResult> GetNovelStatus(int novelId)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(uid)) return Unauthorized();

        var result = await _libraryService.GetNovelStatusAsync(uid, novelId);
        // If status is null, user hasn't added it yet. Return 200 with null or special response.
        return Ok(new { status = result.Data });
    }
}

public record AddLibraryRequest(int NovelId, int Status, int? CurrentChapter = null);
