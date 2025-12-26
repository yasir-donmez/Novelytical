using Microsoft.Extensions.DependencyInjection;
using FluentValidation;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Services;

namespace Novelytical.Application;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationLayer(this IServiceCollection services)
    {
        // Services
        services.AddScoped<INovelService, NovelService>();
        
        // Memory Cache
        services.AddMemoryCache();

        // FluentValidation
        services.AddValidatorsFromAssemblyContaining<INovelService>();

        // AutoMapper (if needed later)
        // services.AddAutoMapper(Assembly.GetExecutingAssembly());

        return services;
    }
}
