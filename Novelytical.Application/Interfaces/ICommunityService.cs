using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;

namespace Novelytical.Application.Interfaces;

public interface ICommunityService
{
    Task<Response<CommunityPostDto>> CreatePostAsync(string firebaseUid, CreatePostRequest request);
    Task<Response<List<CommunityPostDto>>> GetLatestPostsAsync(string? firebaseUid, int take); // Current user needed to check 'UserVotedOptionId'
    Task<Response<List<CommunityPostDto>>> GetUserPostsAsync(string currentFirebaseUid, string targetFirebaseUid);
    Task<Response<bool>> VoteAsync(string firebaseUid, int pollId, int optionId);
    Task<Response<bool>> DeletePostAsync(string firebaseUid, int postId);
    
    // Comments
    Task<Response<List<PostCommentDto>>> GetCommentsAsync(int postId);
    Task<Response<PostCommentDto>> AddCommentAsync(string firebaseUid, int postId, string content);
    Task<Response<bool>> DeleteCommentAsync(string firebaseUid, int commentId);
    
    Task<Response<List<VoterDto>>> GetVotersAsync(int postId);
}
