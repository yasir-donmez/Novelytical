using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Novelytical.Application.Features.Reviews.Queries.GetComments;

public class GetCommentsQuery : IRequest<Response<List<CommentDto>>>
{
    public int NovelId { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class GetCommentsQueryHandler : IRequestHandler<GetCommentsQuery, Response<List<CommentDto>>>
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IDistributedCache _cache;

    public GetCommentsQueryHandler(IReviewRepository reviewRepository, IDistributedCache cache)
    {
        _reviewRepository = reviewRepository;
        _cache = cache;
    }

    public async Task<Response<List<CommentDto>>> Handle(GetCommentsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"comments:{request.NovelId}:fulltree";
        string? cachedData = await _cache.GetStringAsync(cacheKey, cancellationToken);
        List<CommentDto>? fullTree = null;

        if (!string.IsNullOrEmpty(cachedData))
        {
            fullTree = JsonSerializer.Deserialize<List<CommentDto>>(cachedData);
        }

        if (fullTree == null)
        {
            var allComments = await _reviewRepository.GetAllCommentsForNovelAsync(request.NovelId);
            
            var commentMap = allComments.ToDictionary(c => c.Id, c => MapCommentToDto(c));
            
            var roots = new List<CommentDto>();

            // 1. First Pass: Build the tree
            foreach (var commentDto in commentMap.Values)
            {
                if (commentDto.ParentId.HasValue && commentMap.TryGetValue(commentDto.ParentId.Value, out var parent))
                {
                    parent.Replies.Add(commentDto);
                }
                else if (!commentDto.ParentId.HasValue)
                {
                    roots.Add(commentDto);
                }
            }
            
            // 2. Second Pass: Recursive Pruning and Sanitization
            roots = PruneAndSanitize(roots);
            fullTree = roots.OrderByDescending(c => c.CreatedAt).ToList();

            var options = new DistributedCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(2));
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(fullTree), options, cancellationToken);
        }

        // Pagination on Roots
        var paged = fullTree.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList();
        return new Response<List<CommentDto>>(paged);
    }

    private List<CommentDto> PruneAndSanitize(List<CommentDto> nodes)
    {
        var keepNodes = new List<CommentDto>();
        
        foreach (var node in nodes)
        {
            // Recurse first (Bottom-Up)
            node.Replies = PruneAndSanitize(node.Replies);
            
            if (!node.IsDeleted) 
            {
                keepNodes.Add(node);
            }
            else
            {
                // It is deleted
                if (node.Replies.Count > 0)
                {
                    // It has children, so it becomes a Ghost Comment
                    node.Content = "[Bu yorum silinmiştir]";
                    node.UserDisplayName = "Silinmiş Kullanıcı";
                    node.UserAvatarUrl = null; 
                    node.UserId = string.Empty; 
                    node.FirebaseUid = string.Empty;
                    node.IsSpoiler = false; 
                    keepNodes.Add(node);
                }
            }
        }
        
        return keepNodes.OrderBy(n => n.CreatedAt).ToList();
    }

    private CommentDto MapCommentToDto(Comment c)
    {
        return new CommentDto
        {
            Id = c.Id,
            NovelId = c.NovelId,
            UserId = c.UserId.ToString(),
            Content = c.Content,
            IsSpoiler = c.IsSpoiler,
            LikeCount = c.LikeCount,
            DislikeCount = c.DislikeCount,
            UserDisplayName = c.User?.DisplayName ?? "Anonymous",
            UserAvatarUrl = c.User?.AvatarUrl,
            FirebaseUid = c.User?.FirebaseUid ?? string.Empty,
            CreatedAt = c.CreatedAt,
            ParentId = c.ParentId,
            IsDeleted = c.IsDeleted,
            Replies = new List<CommentDto>() 
        };
    }
}
