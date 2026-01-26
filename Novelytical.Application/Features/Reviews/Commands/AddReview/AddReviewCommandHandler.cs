using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;
using Novelytical.Application.Helpers;
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Features.Reviews.Commands.AddReview;

public class AddReviewCommand : IRequest<Response<bool>>
{
    public string FirebaseUid { get; set; }
    public int NovelId { get; set; }
    public string Content { get; set; }
    public bool IsSpoiler { get; set; }
    public double RatingOverall { get; set; }
    public double RatingStory { get; set; }
    public double RatingCharacters { get; set; }
    public double RatingWorld { get; set; }
    public double RatingFlow { get; set; }
    public double RatingGrammar { get; set; }
}

public class AddReviewCommandHandler : IRequestHandler<AddReviewCommand, Response<bool>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly INovelRepository _novelRepository;
    private readonly IDistributedCache _cache;

    public AddReviewCommandHandler(IUserRepository userRepository, IReviewRepository reviewRepository, INovelRepository novelRepository, IDistributedCache cache)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
        _novelRepository = novelRepository;
        _cache = cache;
    }

    public async Task<Response<bool>> Handle(AddReviewCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<bool>("User not found in Postgres. Please sync first.");

        // Check if review exists
        var existingReview = await _reviewRepository.GetReviewByUserAsync(request.NovelId, user.Id);
        if (existingReview != null)
        {
            // Update Existing
            existingReview.Content = request.Content;
            existingReview.IsSpoiler = request.IsSpoiler;
            existingReview.RatingOverall = request.RatingOverall;
            existingReview.RatingStory = request.RatingStory;
            existingReview.RatingCharacters = request.RatingCharacters;
            existingReview.RatingWorld = request.RatingWorld;
            existingReview.RatingFlow = request.RatingFlow;
            existingReview.RatingGrammar = request.RatingGrammar;
            existingReview.UpdatedAt = DateTime.UtcNow;

            await _reviewRepository.UpdateReviewAsync(existingReview);
        }
        else
        {
            // Create New
            var review = new Review
            {
                NovelId = request.NovelId,
                UserId = user.Id,
                Content = request.Content,
                IsSpoiler = request.IsSpoiler,
                RatingOverall = request.RatingOverall,
                RatingStory = request.RatingStory,
                RatingCharacters = request.RatingCharacters,
                RatingWorld = request.RatingWorld,
                RatingFlow = request.RatingFlow,
                RatingGrammar = request.RatingGrammar,
                CreatedAt = DateTime.UtcNow
            };
            await _reviewRepository.AddReviewAsync(review);
        }

        // Remove page 1 cache as it's most likely to change
        await _cache.RemoveAsync($"reviews:{request.NovelId}:1", cancellationToken);

        // Recalculate Stats
        var avgRating = await _reviewRepository.CalculateAverageRatingAsync(request.NovelId);
        var count = await _reviewRepository.GetReviewCountAsync(request.NovelId);

        await _novelRepository.UpdateReviewStatsAsync(request.NovelId, count, avgRating);
        await SyncNovelRank(request.NovelId);

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
