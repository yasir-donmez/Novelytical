using Microsoft.Extensions.Logging;
using Novelytical.Application.Interfaces;

namespace Novelytical.Application.Services.Embeddings;

/// <summary>
/// Dummy embedder for production when vector search is disabled
/// Returns empty embeddings to avoid memory issues
/// </summary>
public class DummyEmbedder : IEmbedder
{
    private readonly ILogger<DummyEmbedder> _logger;
    private const int EmbeddingDimension = 384;

    public DummyEmbedder(ILogger<DummyEmbedder> logger)
    {
        _logger = logger;
        _logger.LogInformation("DummyEmbedder initialized - Vector search disabled for memory optimization");
    }

    public Task<float[]> EmbedAsync(string text)
    {
        _logger.LogWarning("Vector search attempted but disabled. Returning empty embedding.");
        return Task.FromResult(new float[EmbeddingDimension]);
    }
}