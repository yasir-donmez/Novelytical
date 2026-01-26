using Microsoft.EntityFrameworkCore;
using Novelytical.Data;
using Novelytical.Data.Interfaces;

namespace Novelytical.Data.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByFirebaseUidAsync(string uid)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.FirebaseUid == uid);
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users.FindAsync(id);
    }

    public async Task<User> CreateAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(string uid)
    {
        return await _context.Users.AnyAsync(u => u.FirebaseUid == uid);
    }
}
