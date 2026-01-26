using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;
using Novelytical.Application.Helpers;
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Features.Reviews.Commands.DeleteReview;

public class DeleteReviewCommand : IRequest<Response<bool>>
{
    public required string FirebaseUid { get; set; }
    public int ReviewId { get; set; }
}

public class DeleteReviewCommandHandler : IRequestHandler<DeleteReviewCommand, Response<bool>>
{
    private readonly IReviewRepository _reviewRepository;
    private readonly INovelRepository _novelRepository;
    private readonly IDistributedCache _cache;

    public DeleteReviewCommandHandler(IReviewRepository reviewRepository, INovelRepository novelRepository, IDistributedCache cache)
    {
        _reviewRepository = reviewRepository;
        _novelRepository = novelRepository;
        _cache = cache;
    }

    public async Task<Response<bool>> Handle(DeleteReviewCommand request, CancellationToken cancellationToken)
    {
        var review = await _reviewRepository.GetReviewByIdAsync(request.ReviewId);
        if (review == null) return new Response<bool>("Review not found");

        await _reviewRepository.DeleteReviewAsync(request.ReviewId);
        
        await _cache.RemoveAsync($"reviews:{review.NovelId}:1", cancellationToken);
        
        var avgRating = await _reviewRepository.CalculateAverageRatingAsync(review.NovelId);
        var count = await _reviewRepository.GetReviewCountAsync(review.NovelId);
        await _novelRepository.UpdateReviewStatsAsync(review.NovelId, count, avgRating);
        await SyncNovelRank(review.NovelId);

        return new Response<bool>(true);
    }

    private async Task SyncNovelRank(int novelId)
    {
        var novel = await _novelRepository.GetByIdAsync(novelId);
        if (novel != null)
        {
            int newScore = NovelRankingCalculator.CalculateScore(novel);
            await _novelRepository.UpdateRankScoreAsync(novelId, newScore);
        }
    }
}
