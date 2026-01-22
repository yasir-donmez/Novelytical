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
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(System.Reflection.Assembly.GetExecutingAssembly()));

        // Resolve model paths relative to the executing assembly (bin directory)
        var assemblyLocation = System.Reflection.Assembly.GetExecutingAssembly().Location;
        var outputDir = Path.GetDirectoryName(assemblyLocation);
        var embeddingsDir = Path.Combine(outputDir!, "Resources", "Embeddings", "paraphrase-multilingual-MiniLM-L12-v2");

        // Register embedder based on environment
        services.AddSingleton<IEmbedder>(sp =>
        {
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            
            if (environment == "Production")
            {
                // Use dummy embedder in production to save memory
                var logger = sp.GetRequiredService<ILogger<DummyEmbedder>>();
                return new DummyEmbedder(logger);
            }
            else
            {
                // Use real embedder in development/local
                var logger = sp.GetRequiredService<ILogger<Services.Embeddings.OnnxEmbedder>>();
                var modelPath = Path.Combine(embeddingsDir, "model.onnx");
                var tokenizerPath = Path.Combine(embeddingsDir, "sentencepiece.bpe.model");
                
                return new Services.Embeddings.OnnxEmbedder(modelPath, tokenizerPath, logger);
            }
        });


        return services;
    }
}
