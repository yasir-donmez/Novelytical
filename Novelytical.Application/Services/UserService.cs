using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data;
using Novelytical.Data.Interfaces;
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _cache;
    private const string UserProfileCacheKey = "user_profile_{0}";

    public UserService(IUserRepository userRepository, Microsoft.Extensions.Caching.Distributed.IDistributedCache cache)
    {
        _userRepository = userRepository;
        _cache = cache;
    }

    public async Task<Response<UserDto>> GetProfileByUidAsync(string uid)
    {
        var cacheKey = string.Format(UserProfileCacheKey, uid);
        var cachedProfile = await _cache.GetStringAsync(cacheKey);

        if (!string.IsNullOrEmpty(cachedProfile))
        {
            var profileDto = System.Text.Json.JsonSerializer.Deserialize<UserDto>(cachedProfile);
            if (profileDto != null) return new Response<UserDto>(profileDto);
        }

        var user = await _userRepository.GetByFirebaseUidAsync(uid);
        if (user == null) return new Response<UserDto>("User not found in Postgres");

        var dto = MapToDto(user);
        await _cache.SetStringAsync(cacheKey, System.Text.Json.JsonSerializer.Serialize(dto), new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        });

        return new Response<UserDto>(dto);
    }

    public async Task<Response<UserDto>> SyncUserAsync(string uid, string? email, string? displayName, string? avatarUrl)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(uid);

        if (user == null)
        {
            // Create new user in Postgres
            user = new User
            {
                Id = Guid.NewGuid(),
                FirebaseUid = uid,
                Email = email,
                DisplayName = displayName,
                AvatarUrl = avatarUrl,
                Role = "User",
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };
            await _userRepository.CreateAsync(user);
        }
        else
        {
            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            // Optionally update email/displayName if they changed in Firebase
            if (!string.IsNullOrEmpty(email)) user.Email = email;
            if (!string.IsNullOrEmpty(displayName) && string.IsNullOrEmpty(user.DisplayName)) user.DisplayName = displayName;
            if (!string.IsNullOrEmpty(avatarUrl) && string.IsNullOrEmpty(user.AvatarUrl)) user.AvatarUrl = avatarUrl;
            
            await _userRepository.UpdateAsync(user);
        }

        var dto = MapToDto(user);
        
        // Invalidate/Update Cache
        var cacheKey = string.Format(UserProfileCacheKey, uid);
        await _cache.SetStringAsync(cacheKey, System.Text.Json.JsonSerializer.Serialize(dto), new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        });

        return new Response<UserDto>(dto);
    }

    public async Task<Response<bool>> UpdateProfileAsync(string uid, string? displayName, string? bio, string? avatarUrl)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(uid);
        if (user == null) return new Response<bool>("User not found");

        if (displayName != null) user.DisplayName = displayName;
        if (bio != null) user.Bio = bio;
        if (avatarUrl != null) user.AvatarUrl = avatarUrl;

        await _userRepository.UpdateAsync(user);

        // Invalidate Cache
        var cacheKey = string.Format(UserProfileCacheKey, uid);
        await _cache.RemoveAsync(cacheKey);

        return new Response<bool>(true);
    }

    private UserDto MapToDto(User user)
    {
        return new UserDto
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
    }
}
