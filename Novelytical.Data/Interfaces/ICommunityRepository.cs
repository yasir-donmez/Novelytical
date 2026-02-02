using System.Collections.Generic;
using System.Threading.Tasks;
using Novelytical.Data.Entities; 
using Novelytical.Data;

namespace Novelytical.Data.Interfaces;

public interface ICommunityRepository
{
    Task<CommunityPost> CreatePostAsync(CommunityPost post);
    Task<CommunityPost?> GetPostByIdAsync(int postId);
    Task<List<CommunityPost>> GetLatestPostsAsync(int take);
    Task<List<CommunityPost>> GetUserPostsAsync(Guid userId);
    
    Task<PollVote?> GetUserVoteAsync(int pollId, Guid userId);
    Task<List<PollVote>> GetUserVotesForPostsAsync(List<int> postIds, Guid userId);
    Task AddVoteAsync(PollVote vote);
    Task RemoveVoteAsync(PollVote vote);
    Task UpdatePollOptionCountAsync(int optionId, int increment); // atomic increment/decrement
    
    Task DeletePostAsync(int postId);

    // Comments
    Task<List<PostComment>> GetPostCommentsAsync(int postId);
    Task<PostComment> AddCommentAsync(PostComment comment);
    Task DeleteCommentAsync(int commentId);
    Task<List<PollVote>> GetPollVotesAsync(int pollId);
}
