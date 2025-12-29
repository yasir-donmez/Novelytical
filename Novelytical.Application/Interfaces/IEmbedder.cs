using System.Threading.Tasks;

namespace Novelytical.Application.Interfaces;

public interface IEmbedder
{
    Task<float[]> EmbedAsync(string text);
}
