using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Entities;

namespace Novelytical.Application.Features.Support.Commands;

public class CreateSupportTicketCommand : IRequest<Response<int>>
{
    public string? UserId { get; set; } // Firebase UID
    public string Username { get; set; }
    public string Email { get; set; }
    public string Subject { get; set; }
    public string Message { get; set; }
}

public class CreateSupportTicketCommandHandler : IRequestHandler<CreateSupportTicketCommand, Response<int>>
{
    private readonly AppDbContext _context;

    public CreateSupportTicketCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Response<int>> Handle(CreateSupportTicketCommand request, CancellationToken cancellationToken)
    {
        // Optional: Find User ID from Postgres if provided
        Guid? pgUserId = null;
        if (!string.IsNullOrEmpty(request.UserId))
        {
            var user = _context.Users.FirstOrDefault(u => u.FirebaseUid == request.UserId);
            if (user != null) pgUserId = user.Id;
        }

        var ticket = new SupportTicket
        {
            UserId = pgUserId,
            Username = request.Username,
            Email = request.Email,
            Subject = request.Subject,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow,
            IsResolved = false
        };

        _context.SupportTickets.Add(ticket);
        await _context.SaveChangesAsync(cancellationToken);

        return new Response<int>(ticket.Id);
    }
}
