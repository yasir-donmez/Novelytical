using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;
using Novelytical.Application.Helpers; // For NovelRankingCalculator if needed
using Microsoft.Extensions.Caching.Distributed;

namespace Novelytical.Application.Features.Reviews.Commands.AddComment;

public class AddCommentCommand : IRequest<Response<bool>>
{
    public string FirebaseUid { get; set; }
    public int NovelId { get; set; }
    public string Content { get; set; }
    public bool IsSpoiler { get; set; }
    public int? ParentId { get; set; }
}

public class AddCommentCommandHandler : IRequestHandler<AddCommentCommand, Response<bool>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;
    private readonly INovelRepository _novelRepository;
    private readonly IDistributedCache _cache;

    public AddCommentCommandHandler(IUserRepository userRepository, IReviewRepository reviewRepository, INovelRepository novelRepository, IDistributedCache cache)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
        _novelRepository = novelRepository;
        _cache = cache;
    }

    public async Task<Response<bool>> Handle(AddCommentCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<bool>("User not found in Postgres. Please sync first.");

        var comment = new Comment
        {
            NovelId = request.NovelId,
            UserId = user.Id,
            Content = request.Content,
            IsSpoiler = request.IsSpoiler,
            ParentId = request.ParentId,
            CreatedAt = DateTime.UtcNow
        };

        await _reviewRepository.AddCommentAsync(comment);

        // Invalidate Cache
        await _cache.RemoveAsync($"comments:{request.NovelId}:fulltree", cancellationToken);
        
        // Update stats
        var count = await _reviewRepository.GetCommentCountAsync(request.NovelId);
        await _novelRepository.UpdateCommentCountAsync(request.NovelId, count);
        
        // Sync Rank
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
