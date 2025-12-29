using Microsoft.Extensions.DependencyInjection;
using FluentValidation;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Services;
using Microsoft.Extensions.Logging;

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
