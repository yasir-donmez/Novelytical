using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Novelytical.Application.Interfaces;

namespace Novelytical.Application.Features.Novels.Commands.UpdateStats;

// --- Commands ---

public class IncrementSiteViewCommand : IRequest<Response<bool>>
{
    public int NovelId { get; set; }
}

public class UpdateCommentCountCommand : IRequest<Response<bool>>
{
    public int NovelId { get; set; }
    public int Count { get; set; }
}

public class UpdateReviewCountCommand : IRequest<Response<bool>>
{
    public int NovelId { get; set; }
    public int Count { get; set; }
    public double? AverageRating { get; set; }
    // Detailed Ratings
    public double? RatingStory { get; set; }
    public double? RatingCharacters { get; set; }
    public double? RatingWorld { get; set; }
    public double? RatingFlow { get; set; }
    public double? RatingGrammar { get; set; }
}

public class UpdateLibraryCountCommand : IRequest<Response<bool>>
{
    public int NovelId { get; set; }
    public int Count { get; set; }
}

// --- Handlers ---

public class UpdateStatsCommandHandler : 
    IRequestHandler<IncrementSiteViewCommand, Response<bool>>,
    IRequestHandler<UpdateCommentCountCommand, Response<bool>>,
    IRequestHandler<UpdateReviewCountCommand, Response<bool>>,
    IRequestHandler<UpdateLibraryCountCommand, Response<bool>>
{
    private readonly IStatsBatchService _batchService;
    private readonly INovelRepository _repository;

    public UpdateStatsCommandHandler(INovelRepository repository, IStatsBatchService batchService)
    {
        _repository = repository;
        _batchService = batchService;
    }

    public Task<Response<bool>> Handle(IncrementSiteViewCommand request, CancellationToken cancellationToken)
    {
        // Use batch service to buffer views in memory -> Redis -> Nightly DB Sync
        _batchService.AccumulateView(request.NovelId);
        
        // Return success immediately (fire and forget)
        return Task.FromResult(new Response<bool>(true));
    }

    public async Task<Response<bool>> Handle(UpdateCommentCountCommand request, CancellationToken cancellationToken)
    {
        await _repository.UpdateCommentCountAsync(request.NovelId, request.Count);
        await SyncRankScore(request.NovelId);
        return new Response<bool>(true);
    }

    public async Task<Response<bool>> Handle(UpdateLibraryCountCommand request, CancellationToken cancellationToken)
    {
        await _repository.UpdateLibraryCountAsync(request.NovelId, request.Count);
        // Library count doesn't affect rank score in current formula, but we keep it for consistency
        return new Response<bool>(true);
    }

    public async Task<Response<bool>> Handle(UpdateReviewCountCommand request, CancellationToken cancellationToken)
    {
        await _repository.UpdateReviewStatsAsync(
            request.NovelId, 
            request.Count, 
            request.AverageRating,
            request.RatingStory,
            request.RatingCharacters,
            request.RatingWorld,
            request.RatingFlow,
            request.RatingGrammar
        );
        await SyncRankScore(request.NovelId);
        return new Response<bool>(true);
    }

    private async Task SyncRankScore(int novelId)
    {
        var novel = await _repository.GetByIdAsync(novelId);
        if (novel != null)
        {
            var newScore = Helpers.NovelRankingCalculator.CalculateScore(novel);
            await _repository.UpdateRankScoreAsync(novelId, newScore);
        }
    }
}
