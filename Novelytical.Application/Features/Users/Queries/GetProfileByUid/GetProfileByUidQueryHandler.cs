using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Novelytical.Application.Features.Users.Queries.GetProfileByUid;

public class GetProfileByUidQuery : IRequest<Response<UserDto>>
{
    public string Uid { get; set; }

    public GetProfileByUidQuery(string uid)
    {
        Uid = uid;
    }
}

public class GetProfileByUidQueryHandler : IRequestHandler<GetProfileByUidQuery, Response<UserDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IDistributedCache _cache;
    private const string UserProfileCacheKey = "user_profile_{0}";

    public GetProfileByUidQueryHandler(IUserRepository userRepository, IDistributedCache cache)
    {
        _userRepository = userRepository;
        _cache = cache;
    }

    public async Task<Response<UserDto>> Handle(GetProfileByUidQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = string.Format(UserProfileCacheKey, request.Uid);
        var cachedProfile = await _cache.GetStringAsync(cacheKey, cancellationToken);

        if (!string.IsNullOrEmpty(cachedProfile))
        {
            var profileDto = JsonSerializer.Deserialize<UserDto>(cachedProfile);
            if (profileDto != null) return new Response<UserDto>(profileDto);
        }

        var user = await _userRepository.GetByFirebaseUidAsync(request.Uid);
        if (user == null) return new Response<UserDto>("User not found in Postgres");

        var dto = new UserDto
        {
            Id = user.Id,
            FirebaseUid = user.FirebaseUid,
            Email = user.Email,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        };

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dto), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        }, cancellationToken);

        return new Response<UserDto>(dto);
    }
}
