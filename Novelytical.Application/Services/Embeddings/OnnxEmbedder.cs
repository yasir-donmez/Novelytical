using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Microsoft.ML.Tokenizers;
using Novelytical.Application.Interfaces;

namespace Novelytical.Application.Services.Embeddings;

/// <summary>
/// ONNX-based text embedder with multilingual support
/// Uses paraphrase-multilingual-MiniLM-L12-v2 model with Microsoft.ML.Tokenizers
/// </summary>
public class OnnxEmbedder : IEmbedder, IDisposable
{
    private readonly InferenceSession _session;
    private readonly ILogger<OnnxEmbedder> _logger;
    private readonly SentencePieceTokenizer _tokenizer;
    private const int MaxSequenceLength = 128;
    private const int EmbeddingDimension = 384;

    public OnnxEmbedder(string modelPath, string tokenizerPath, ILogger<OnnxEmbedder> logger)
    {
        _logger = logger;
        
        if (!File.Exists(modelPath))
            throw new FileNotFoundException($"Model file not found: {modelPath}");
        
        if (!File.Exists(tokenizerPath))
            throw new FileNotFoundException($"Tokenizer file not found: {tokenizerPath}");

        try 
        {
            _session = new InferenceSession(modelPath);
            _tokenizer = LoadTokenizer(tokenizerPath);
            _logger.LogInformation("OnnxEmbedder initialized with model: {ModelPath}", modelPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize OnnxEmbedder");
            throw;
        }
    }

    private SentencePieceTokenizer LoadTokenizer(string tokenizerPath)
    {
        try 
        {
            using var stream = File.OpenRead(tokenizerPath);
            var tokenizer = SentencePieceTokenizer.Create(stream);
            _logger.LogInformation("SentencePiece tokenizer loaded successfully from: {TokenizerPath}", tokenizerPath);
            return tokenizer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading SentencePiece tokenizer");
            throw;
        }
    }

    public async Task<float[]> EmbedAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new float[EmbeddingDimension];

        return await Task.Run(() => 
        {
            try
            {
                return GenerateEmbedding(text);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Embedding generation failed");
                return new float[EmbeddingDimension];
            }
        });
    }

    private float[] GenerateEmbedding(string text)
    {
        // Tokenize using Microsoft.ML.Tokenizers
        // EncodeToIds(text, addBeginningOfSentence, addEndOfSentence, considerPreTokenization, considerNormalization)
        var encodedIds = _tokenizer.EncodeToIds(text, true, true, true, true);
        var inputIds = encodedIds.Select(id => (long)id).ToList();
        
        // Truncate if needed
        if (inputIds.Count > MaxSequenceLength)
        {
            inputIds = inputIds.Take(MaxSequenceLength).ToList();
        }

        // Pad to MaxSequenceLength
        int paddingLength = MaxSequenceLength - inputIds.Count;
        var attentionMask = Enumerable.Repeat(1L, inputIds.Count).ToList();
        var tokenTypeIds = Enumerable.Repeat(0L, MaxSequenceLength).ToArray(); 

        if (paddingLength > 0)
        {
            inputIds.AddRange(Enumerable.Repeat(0L, paddingLength)); // Pad with 0 (standard padding ID)
            attentionMask.AddRange(Enumerable.Repeat(0L, paddingLength));
        }

        var inputIdsArray = inputIds.ToArray();
        var attentionMaskArray = attentionMask.ToArray();

        var dimensions = new int[] { 1, MaxSequenceLength };
        
        var inputIdsTensor = new DenseTensor<long>(new Memory<long>(inputIdsArray), new ReadOnlySpan<int>(dimensions));
        var attentionMaskTensor = new DenseTensor<long>(new Memory<long>(attentionMaskArray), new ReadOnlySpan<int>(dimensions));
        var tokenTypeIdsTensor = new DenseTensor<long>(new Memory<long>(tokenTypeIds), new ReadOnlySpan<int>(dimensions));

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIdsTensor),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMaskTensor),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIdsTensor)
        };

        using var results = _session.Run(inputs);
        var outputTensor = results.First().AsTensor<float>(); 
        
        var embeddings = new float[EmbeddingDimension];
        int validCount = 0;

        for (int i = 0; i < MaxSequenceLength; i++)
        {
            if (attentionMaskArray[i] == 1)
            {
                for (int j = 0; j < EmbeddingDimension; j++)
                {
                    embeddings[j] += outputTensor[0, i, j];
                }
                validCount++;
            }
        }

        if (validCount > 0)
        {
            for (int j = 0; j < EmbeddingDimension; j++)
            {
                embeddings[j] /= validCount;
            }
        }

        var norm = (float)Math.Sqrt(embeddings.Sum(x => x * x));
        if (norm > 1e-9)
        {
            for (int i = 0; i < embeddings.Length; i++)
            {
                embeddings[i] /= norm;
            }
        }

        return embeddings;
    }



    public void Dispose()
    {
        _session?.Dispose();
    }
}
