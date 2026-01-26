using Microsoft.AspNetCore.Mvc;
using MediatR;
using Novelytical.Application.Features.Authors.Queries.GetTopAuthors;

namespace Novelytical.Web.Controllers;

[ApiController]
[Route("api/authors")]
public class AuthorsController : ControllerBase
{
    private readonly IMediator _mediator;
    
    public AuthorsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("top")]
    public async Task<IActionResult> GetTopAuthors(int page = 1, int pageSize = 30)
    {
        var result = await _mediator.Send(new GetTopAuthorsQuery { Page = page, PageSize = pageSize });
        return Ok(result.Data); // Return the AuthorsRankResponse object directly as before
    }
}
