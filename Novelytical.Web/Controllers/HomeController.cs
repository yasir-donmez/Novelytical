using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Interfaces;
using Novelytical.Web.Models;

namespace Novelytical.Web.Controllers;

public class HomeController : Controller
{
    private readonly INovelService _novelService;

    public HomeController(INovelService novelService)
    {
        _novelService = novelService;
    }

    // 🚀 Phase 2: Using INovelService with Projection for performance
    public async Task<IActionResult> Index(string? searchString, string? sortOrder, int pageNumber = 1)
    {
        // Call service layer
        var result = await _novelService.GetNovelsAsync(searchString, sortOrder, pageNumber);

        if (!result.Succeeded)
            return BadRequest(result.Message);

        // Pass data to view
        ViewData["CurrentSort"] = sortOrder;
        ViewData["CurrentFilter"] = searchString;
        ViewData["PageIndex"] = result.PageNumber;
        ViewData["TotalPages"] = result.TotalPages;
        ViewData["HasPreviousPage"] = result.PageNumber > 1;
        ViewData["HasNextPage"] = result.PageNumber < result.TotalPages;

        // Sorting button params
        ViewData["RatingSortParm"] = string.IsNullOrEmpty(sortOrder) ? "rating_asc" : "";
        ViewData["DateSortParm"] =sortOrder == "Date" ? "date_desc" : "Date";
        ViewData["ChapterSortParm"] = sortOrder == "Chapters" ? "chapters_desc" : "Chapters";

        return View(result.Data);
    }

    public async Task<IActionResult> Details(int? id)
    {
        if (id == null)
            return NotFound();

        var result = await _novelService.GetNovelByIdAsync(id.Value);

        if (!result.Succeeded)
            return NotFound();

        return View(result.Data);
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}