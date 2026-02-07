using MediatR;
using Novelytical.Application.DTOs;
using Novelytical.Application.Interfaces;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Entities;
using Novelytical.Data.Interfaces;
using System;

namespace Novelytical.Application.Features.Community.Commands.VotePost;

public class VotePostCommand : IRequest<Response<bool>>
{
    public required string FirebaseUid { get; set; }
    public int PostId { get; set; }
    public int OptionId { get; set; }
}

public class VotePostCommandHandler : IRequestHandler<VotePostCommand, Response<bool>>
{
    private readonly ICommunityRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IRealTimeService _realTimeService;

    public VotePostCommandHandler(ICommunityRepository repository, IUserRepository userRepository, IRealTimeService realTimeService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _realTimeService = realTimeService;
    }

    public async Task<Response<bool>> Handle(VotePostCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<bool>("User not found");

        var post = await _repository.GetPostByIdAsync(request.PostId);
        if (post == null) return new Response<bool>("Post not found");

        if (post.Type != PostType.Poll) return new Response<bool>("Not a poll");
        
        if (post.ExpiresAt.HasValue && post.ExpiresAt < DateTime.UtcNow)
            return new Response<bool>("Poll has expired");

        var existingVote = await _repository.GetUserVoteAsync(request.PostId, user.Id);
        
        if (existingVote != null)
        {
            if (existingVote.OptionId == request.OptionId)
            {
                // Toggle off (Unvote)
                await _repository.RemoveVoteAsync(existingVote);
                await _repository.UpdatePollOptionCountAsync(existingVote.OptionId, -1);
            }
            else
            {
                // Switch vote
                await _repository.UpdatePollOptionCountAsync(existingVote.OptionId, -1);
                await _repository.RemoveVoteAsync(existingVote);
                
                var newVote = new PollVote { PollId = request.PostId, OptionId = request.OptionId, UserId = user.Id };
                await _repository.AddVoteAsync(newVote);
                await _repository.UpdatePollOptionCountAsync(request.OptionId, 1);
            }
        }
        else
        {
            // New vote
            var newVote = new PollVote { PollId = request.PostId, OptionId = request.OptionId, UserId = user.Id };
            await _repository.AddVoteAsync(newVote);
            await _repository.UpdatePollOptionCountAsync(request.OptionId, 1);
        }

        // 📡 Broadcast update via RealTime Service
        var updatedPost = await _repository.GetPostByIdAsync(request.PostId);
        if (updatedPost != null)
        {
             var optionDtos = updatedPost.Options.Select(o => new PollOptionDto
             {
                 Id = o.Id,
                 Text = o.Text,
                 VoteCount = o.VoteCount,
                 RelatedNovelId = o.RelatedNovelId,
                 RelatedNovelTitle = o.RelatedNovel?.Title,
                 RelatedNovelCoverUrl = o.RelatedNovel?.CoverUrl
             }).ToList();

             await _realTimeService.BroadcastPollUpdateAsync(request.PostId, optionDtos);
        }

        return new Response<bool>(true);
    }
}
