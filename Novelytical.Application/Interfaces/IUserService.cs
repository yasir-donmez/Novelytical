using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Interfaces;

public interface IUserService
{
    Task<Response<UserDto>> GetProfileByUidAsync(string uid);
    Task<Response<UserDto>> SyncUserAsync(string uid, string? email, string? displayName, string? avatarUrl);
    Task<Response<bool>> UpdateProfileAsync(string uid, string? displayName, string? bio, string? avatarUrl);
}
