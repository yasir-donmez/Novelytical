using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Community.Queries.GetPostVoters;

public class GetPostVotersQuery : IRequest<Response<List<VoterDto>>>
{
    public int PostId { get; set; }
}

public class GetPostVotersQueryHandler : IRequestHandler<GetPostVotersQuery, Response<List<VoterDto>>>
{
    private readonly ICommunityRepository _repository;

    public GetPostVotersQueryHandler(ICommunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Response<List<VoterDto>>> Handle(GetPostVotersQuery request, CancellationToken cancellationToken)
    {
        var votes = await _repository.GetPollVotesAsync(request.PostId);
        var dtos = votes.Select(v => new VoterDto
        {
            UserId = v.User?.FirebaseUid ?? string.Empty,
            UserName = v.User?.DisplayName ?? "Anonymous",
            UserImage = v.User?.AvatarUrl,
            // UserFrame = ... // If frame is added to User entity
            OptionId = v.OptionId
        }).ToList();
        
        return new Response<List<VoterDto>>(dtos);
    }
}
