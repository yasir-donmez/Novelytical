using MediatR;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Community.Commands.DeletePost;

public class DeletePostCommand : IRequest<Response<bool>>
{
    public required string FirebaseUid { get; set; }
    public int PostId { get; set; }
}

public class DeletePostCommandHandler : IRequestHandler<DeletePostCommand, Response<bool>>
{
    private readonly ICommunityRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IRealTimeService _realTimeService;

    public DeletePostCommandHandler(ICommunityRepository repository, IUserRepository userRepository, IRealTimeService realTimeService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _realTimeService = realTimeService;
    }

    public async Task<Response<bool>> Handle(DeletePostCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<bool>("User not found");

        var post = await _repository.GetPostByIdAsync(request.PostId);
        if (post == null) return new Response<bool>("Post not found");

        // Authorization: Only owner can delete (or Admin, but keeping it simple as per service logic)
        if (post.UserId != user.Id) return new Response<bool>("Unauthorized");

        await _repository.DeletePostAsync(request.PostId);

        // 📡 Broadcast deletion
        await _realTimeService.BroadcastPostDeletedAsync(request.PostId);

        return new Response<bool>(true);
    }
}
