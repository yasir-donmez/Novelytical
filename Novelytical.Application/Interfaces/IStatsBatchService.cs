using System.Threading.Tasks;

namespace Novelytical.Application.Interfaces;

public interface IStatsBatchService
{
    void AccumulateView(int novelId);
    void AccumulateComment(int novelId);
    void AccumulateReview(int novelId);
    Task FlushToRedis();
}
