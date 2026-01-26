using Novelytical.Data.Entities; 
using Novelytical.Data;

namespace Novelytical.Data.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByFirebaseUidAsync(string uid);
    Task<User?> GetByIdAsync(Guid id);
    Task<User> CreateAsync(User user);
    Task UpdateAsync(User user);
    Task<bool> ExistsAsync(string uid);
}
