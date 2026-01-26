using Novelytical.Application.Interfaces;

namespace Novelytical.Web.Services;

public class NoOpStatsBatchService : IStatsBatchService
{
    private readonly ILogger<NoOpStatsBatchService> _logger;

    public NoOpStatsBatchService(ILogger<NoOpStatsBatchService> logger)
    {
        _logger = logger;
    }

    public void AccumulateView(int novelId)
    {
        // No-op: Redis is disabled, so we don't accumulate real-time stats here.
        // We could implement a DB-direct write here if critical, but for now we follow the "Batch" architecture.
    }

    public void AccumulateComment(int novelId)
    {
        // No-op
    }

    public void AccumulateReview(int novelId)
    {
        // No-op
    }

    public Task FlushToRedis()
    {
        _logger.LogWarning("FlushToRedis called but Redis is disabled. No stats flushed.");
        return Task.CompletedTask;
    }
}
