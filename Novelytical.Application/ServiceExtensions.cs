using Microsoft.Extensions.DependencyInjection;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Novelytical.Application;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationLayer(this IServiceCollection services)
    {
        // Services
        // Services
        // INovelService removed - using CQRS
        
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

        // Register OnnxEmbedder
        services.AddSingleton<IEmbedder>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<Services.Embeddings.OnnxEmbedder>>();
            var modelPath = Path.Combine(embeddingsDir, "model.onnx");
            var tokenizerPath = Path.Combine(embeddingsDir, "tokenizer.json");
            
            return new Services.Embeddings.OnnxEmbedder(modelPath, tokenizerPath, logger);
        });


        return services;
    }
}
