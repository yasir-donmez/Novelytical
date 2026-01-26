using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Novelytical.Data.Entities;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Novelytical.Application.Features.Users.Commands.SyncUser;

public class SyncUserCommand : IRequest<Response<UserDto>>
{
    public string Uid { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
}

public class SyncUserCommandHandler : IRequestHandler<SyncUserCommand, Response<UserDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IDistributedCache _cache;
    private const string UserProfileCacheKey = "user_profile_{0}";

    public SyncUserCommandHandler(IUserRepository userRepository, IDistributedCache cache)
    {
        _userRepository = userRepository;
        _cache = cache;
    }

    public async Task<Response<UserDto>> Handle(SyncUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.Uid);

        if (user == null)
        {
            // Create new user
            user = new User
            {
                Id = Guid.NewGuid(),
                FirebaseUid = request.Uid,
                Email = request.Email,
                DisplayName = request.DisplayName,
                AvatarUrl = request.AvatarUrl,
                Role = "User",
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };
            await _userRepository.CreateAsync(user);
        }
        else
        {
            // Update existng
            user.LastLoginAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(request.Email)) user.Email = request.Email;
            if (!string.IsNullOrEmpty(request.DisplayName) && string.IsNullOrEmpty(user.DisplayName)) user.DisplayName = request.DisplayName;
            if (!string.IsNullOrEmpty(request.AvatarUrl) && string.IsNullOrEmpty(user.AvatarUrl)) user.AvatarUrl = request.AvatarUrl;
            
            await _userRepository.UpdateAsync(user);
        }

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
        
        // Invalidate/Update Cache
        var cacheKey = string.Format(UserProfileCacheKey, request.Uid);
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dto), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        }, cancellationToken);

        return new Response<UserDto>(dto);
    }
}
