using MediatR;
using Novelytical.Application.Wrappers;
using Novelytical.Data.Interfaces;

namespace Novelytical.Application.Features.Reviews.Queries.GetUserReviewReactions;

public class GetUserReviewReactionsQuery : IRequest<Response<Dictionary<int, int>>>
{
    public required string FirebaseUid { get; set; }
    public required List<int> ReviewIds { get; set; }
}

public class GetUserReviewReactionsQueryHandler : IRequestHandler<GetUserReviewReactionsQuery, Response<Dictionary<int, int>>>
{
    private readonly IUserRepository _userRepository;
    private readonly IReviewRepository _reviewRepository;

    public GetUserReviewReactionsQueryHandler(IUserRepository userRepository, IReviewRepository reviewRepository)
    {
        _userRepository = userRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<Response<Dictionary<int, int>>> Handle(GetUserReviewReactionsQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByFirebaseUidAsync(request.FirebaseUid);
        if (user == null) return new Response<Dictionary<int, int>>("User not found");

        var reactions = await _reviewRepository.GetUserReviewReactionsAsync(request.ReviewIds, user.Id);
        return new Response<Dictionary<int, int>>(reactions);
    }
}
