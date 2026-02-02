using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Reviews.Queries.GetUserCommentReactions;

public class GetUserCommentReactionsQuery : IRequest<Response<Dictionary<int, int>>>
{
    public required string FirebaseUid { get; set; }
    public required List<int> CommentIds { get; set; }
}

public class GetUserCommentReactionsQueryHandler : IRequestHandler<GetUserCommentReactionsQuery, Response<Dictionary<int, int>>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;

    public GetUserCommentReactionsQueryHandler(IUserRepository userRepository, IReviewRepository reviewRepository)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<Dictionary<int, int>>> Handle(GetUserCommentReactionsQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<Dictionary<int, int>>("User not found");

        var reactions = await _reviewRepository.GetUserCommentReactionsAsync(request.CommentIds, user.Id);
        return new Response<Dictionary<int, int>>(reactions);
    }
}
