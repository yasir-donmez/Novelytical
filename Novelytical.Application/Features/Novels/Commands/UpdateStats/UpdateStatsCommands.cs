using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

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
    public double? AverageRating { get; set; } // New: Sync average rating
}

// --- Handlers ---

public class UpdateStatsCommandHandler : 
    IRequestHandler<IncrementSiteViewCommand, Response<bool>>,
    IRequestHandler<UpdateCommentCountCommand, Response<bool>>,
    IRequestHandler<UpdateReviewCountCommand, Response<bool>>
{
    private readonly INovelRepository _repository;

    public UpdateStatsCommandHandler(INovelRepository repository)
    {
        _repository = repository;
    }

    public async Task<Response<bool>> Handle(IncrementSiteViewCommand request, CancellationToken cancellationToken)
    {
        await _repository.IncrementSiteViewAsync(request.NovelId);
        return new Response<bool>(true);
    }

    public async Task<Response<bool>> Handle(UpdateCommentCountCommand request, CancellationToken cancellationToken)
    {
        await _repository.UpdateCommentCountAsync(request.NovelId, request.Count);
        return new Response<bool>(true);
    }

    public async Task<Response<bool>> Handle(UpdateReviewCountCommand request, CancellationToken cancellationToken)
    {
        await _repository.UpdateReviewStatsAsync(request.NovelId, request.Count, request.AverageRating);
        return new Response<bool>(true);
    }
}
