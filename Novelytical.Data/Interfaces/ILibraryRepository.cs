using Novelytical.Data.Entities;
namespace Novelytical.Data.Interfaces;

public interface ILibraryRepository
{
    Task<UserLibrary?> GetUserLibraryItemAsync(Guid userId, int novelId);
    Task<IEnumerable<UserLibrary>> GetUserLibraryAsync(Guid userId);
    Task AddToLibraryAsync(UserLibrary userLibrary);
    Task UpdateLibraryItemAsync(UserLibrary userLibrary);
    Task RemoveFromLibraryAsync(UserLibrary userLibrary);
}
