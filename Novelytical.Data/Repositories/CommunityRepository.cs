using Microsoft.EntityFrameworkCore;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;
using Novelytical.Data;

namespace Novelytical.Data.Repositories;

public class CommunityRepository : ICommunityRepository
{
    private readonly AppDbContext _context;

    public CommunityRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CommunityPost> CreatePostAsync(CommunityPost post)
    {
        _context.CommunityPosts.Add(post);
        await _context.SaveChangesAsync();
        return post;
    }

    public async Task<CommunityPost?> GetPostByIdAsync(int postId)
    {
        return await _context.CommunityPosts
            .Include(p => p.User)
            .Include(p => p.Options)
                .ThenInclude(o => o.RelatedNovel)
            .FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);
    }

    public async Task<List<CommunityPost>> GetLatestPostsAsync(int take)
    {
        return await _context.CommunityPosts
            .Include(p => p.User)
            .Include(p => p.Options)
                .ThenInclude(o => o.RelatedNovel)
            .Where(p => p.IsActive && !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync();
    }

    public async Task<List<CommunityPost>> GetUserPostsAsync(Guid userId)
    {
        return await _context.CommunityPosts
            .Include(p => p.User)
            .Include(p => p.Options)
                .ThenInclude(o => o.RelatedNovel)
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<PollVote?> GetUserVoteAsync(int pollId, Guid userId)
    {
        return await _context.PollVotes
            .FirstOrDefaultAsync(v => v.PollId == pollId && v.UserId == userId);
    }

    public async Task AddVoteAsync(PollVote vote)
    {
        _context.PollVotes.Add(vote);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveVoteAsync(PollVote vote)
    {
        _context.PollVotes.Remove(vote);
        await _context.SaveChangesAsync();
    }

    public async Task<List<PollVote>> GetPollVotesAsync(int pollId)
    {
        return await _context.PollVotes
            .Include(v => v.User)
            .Where(v => v.PollId == pollId)
            .ToListAsync();
    }

    public async Task UpdatePollOptionCountAsync(int optionId, int increment)
    {
        var option = await _context.PollOptions.FindAsync(optionId);
        if (option != null)
        {
            option.VoteCount += increment;
            if (option.VoteCount < 0) option.VoteCount = 0;
            await _context.SaveChangesAsync();
        }
    }

    public async Task DeletePostAsync(int postId)
    {
        var post = await _context.CommunityPosts.FindAsync(postId);
        if (post != null)
        {
            post.IsDeleted = true;
            await _context.SaveChangesAsync();
        }
    }

    // Comments Implementation
    public async Task<List<PostComment>> GetPostCommentsAsync(int postId)
    {
        return await _context.PostComments
            .Include(c => c.User)
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<PostComment> AddCommentAsync(PostComment comment)
    {
        _context.PostComments.Add(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    public async Task DeleteCommentAsync(int commentId)
    {
        var comment = await _context.PostComments.FindAsync(commentId);
        if (comment != null)
        {
            _context.PostComments.Remove(comment);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<PollVote>> GetUserVotesForPostsAsync(List<int> postIds, Guid userId)
    {
        if (!postIds.Any()) return new List<PollVote>();

        return await _context.PollVotes
            .Where(v => postIds.Contains(v.PollId) && v.UserId == userId)
            .ToListAsync();
    }
}
