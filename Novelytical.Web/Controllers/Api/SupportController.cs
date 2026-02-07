using MediatR;
using Microsoft.AspNetCore.Mvc;
using Novelytical.Application.Features.Support.Commands;

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
public class SupportController : ControllerBase
{
    private readonly IMediator _mediator;

    public SupportController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
