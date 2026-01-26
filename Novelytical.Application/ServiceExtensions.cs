using Microsoft.Extensions.DependencyInjection;
using FluentValidation;
using Microsoft.Extensions.Logging;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Services.Embeddings;

namespace Novelytical.Application;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationLayer(this IServiceCollection services)
    {
        // Memory Cache
        services.AddMemoryCache();

        // FluentValidation
        services.AddValidatorsFromAssemblyContaining<Novelytical.Application.Features.Novels.Queries.GetNovels.GetNovelsQuery>();

        // MediatR
        // MediatR
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssembly(System.Reflection.Assembly.GetExecutingAssembly());
            cfg.AddOpenBehavior(typeof(Novelytical.Application.Behaviours.ValidationBehavior<,>));
        });

        // Resolve model paths relative to the executing assembly (bin directory)
        var assemblyLocation = System.Reflection.Assembly.GetExecutingAssembly().Location;
        var outputDir = Path.GetDirectoryName(assemblyLocation);
        var embeddingsDir = Path.Combine(outputDir!, "Resources", "Embeddings", "paraphrase-multilingual-MiniLM-L12-v2");

        // PRODUCTION MEMORY OPTIMIZATION: Always use DummyEmbedder
        // Vector search completely disabled to prevent memory issues
        services.AddSingleton<IEmbedder>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<DummyEmbedder>>();
            return new DummyEmbedder(logger);
        });



        services.AddScoped<ICommunityService, Services.CommunityService>();
        services.AddScoped<ILibraryService, Services.LibraryService>();
        return services;
    }
}
