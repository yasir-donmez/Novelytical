using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Novelytical.Data;
using Novelytical.Data.Interfaces;
using Novelytical.Data.Repositories;

namespace Novelytical.Data;

public static class ServiceExtensions
{
    public static IServiceCollection AddDataLayer(this IServiceCollection services, string connectionString)
    {
        // DbContext
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, o => o.UseVector()));

        // Repositories
        services.AddScoped<INovelRepository, NovelRepository>();

        return services;
    }
}
