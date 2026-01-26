using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Features.Users.Commands.UpdateProfile;

public class UpdateProfileCommand : IRequest<Response<bool>>
{
    public string Uid { get; set; }
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
}

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, Response<bool>>
{
    private readonly IUserRepository _userRepository;
    private readonly IDistributedCache _cache;
    private const string UserProfileCacheKey = "user_profile_{0}";

    public UpdateProfileCommandHandler(IUserRepository userRepository, IDistributedCache cache)
    {
        _userRepository = userRepository;
        _cache = cache;
    }

    public async Task<Response<bool>> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.Uid);
        if (user == null) return new Response<bool>("User not found");

        if (request.DisplayName != null) user.DisplayName = request.DisplayName;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl;

        await _userRepository.UpdateAsync(user);

        // Invalidate Cache
        var cacheKey = string.Format(UserProfileCacheKey, request.Uid);
        await _cache.RemoveAsync(cacheKey, cancellationToken);

        return new Response<bool>(true);
    }
}
