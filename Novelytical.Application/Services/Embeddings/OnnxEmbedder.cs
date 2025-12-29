using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Microsoft.ML.Tokenizers;
using Novelytical.Application.Interfaces;

namespace Novelytical.Application.Services.Embeddings;

/// <summary>
/// ONNX-based text embedder with multilingual support
/// Uses paraphrase-multilingual-MiniLM-L12-v2 model and Microsoft.ML.Tokenizers
/// </summary>
public class OnnxEmbedder : IEmbedder, IDisposable
{
    private readonly InferenceSession _session;
    private readonly ILogger<OnnxEmbedder> _logger;
    private Dictionary<string, int> _vocab;
    private const int MaxSequenceLength = 128;
    private const int EmbeddingDimension = 384;
    private int _clsTokenId;
    private int _sepTokenId;
    private int _padTokenId;
    private int _unkTokenId;

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
            LoadTokenizer(tokenizerPath);
            _logger.LogInformation("OnnxEmbedder initialized with model: {ModelPath}", modelPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize OnnxEmbedder");
            throw;
        }
    }

    private void LoadTokenizer(string tokenizerPath)
    {
        try 
        {
            var jsonContent = File.ReadAllText(tokenizerPath);
            using var doc = System.Text.Json.JsonDocument.Parse(jsonContent);
            var root = doc.RootElement;

            // Try to find vocab. Usually in model.vocab
            if (root.TryGetProperty("model", out var model) && model.TryGetProperty("vocab", out var vocabElement))
            {
                _vocab = new Dictionary<string, int>();
                
                if (vocabElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    // SentencePiece / Unigram style: Vocab is array of [token, score]
                    int index = 0;
                    foreach (var item in vocabElement.EnumerateArray())
                    {
                        // item is usually [string, float]
                        if (item.ValueKind == System.Text.Json.JsonValueKind.Array && item.GetArrayLength() >= 1)
                        {
                            var token = item[0].GetString();
                            if (token != null)
                                _vocab[token] = index;
                        }
                        index++;
                    }
                }
                else if (vocabElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    // WordPiece / BERT style: Vocab is dictionary { token: id }
                    foreach (var property in vocabElement.EnumerateObject())
                    {
                        _vocab[property.Name] = property.Value.GetInt32();
                    }
                }
            }
            else
            {
                throw new Exception("Could not find 'model.vocab' in tokenizer.json");
            }

            // Set special token IDs (defaults for BERT/MiniLM)
            _clsTokenId = _vocab.GetValueOrDefault("[CLS]", 101); // fallback to bert defaults 
            _sepTokenId = _vocab.GetValueOrDefault("[SEP]", 102);
            _padTokenId = _vocab.GetValueOrDefault("[PAD]", 0);
            _unkTokenId = _vocab.GetValueOrDefault("[UNK]", 100);
            
            // Check if model uses <s> </s> (XLM-R style) instead
            if (!_vocab.ContainsKey("[CLS]") && _vocab.ContainsKey("<s>"))
            {
                _clsTokenId = _vocab["<s>"];
                _sepTokenId = _vocab["</s>"];
                _unkTokenId = _vocab.GetValueOrDefault("<unk>", 3);
                _padTokenId = _vocab.GetValueOrDefault("<pad>", 1);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading tokenizer vocab");
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
        var tokens = Tokenize(text);
        
        // Add special tokens
        var inputIds = new List<long> { _clsTokenId };
        inputIds.AddRange(tokens);
        inputIds.Add(_sepTokenId);

        // Truncate
        if (inputIds.Count > MaxSequenceLength)
        {
            inputIds = inputIds.Take(MaxSequenceLength - 1).ToList();
            inputIds.Add(_sepTokenId); // Ensure SEP is at end
        }

        // Pad
        int paddingLength = MaxSequenceLength - inputIds.Count;
        var attentionMask = Enumerable.Repeat(1L, inputIds.Count).ToList();
        var tokenTypeIds = Enumerable.Repeat(0L, MaxSequenceLength).ToArray(); // Constant 0 for single sentence

        if (paddingLength > 0)
        {
            inputIds.AddRange(Enumerable.Repeat((long)_padTokenId, paddingLength));
            attentionMask.AddRange(Enumerable.Repeat(0L, paddingLength));
        }

        var inputIdsArray = inputIds.ToArray();
        var attentionMaskArray = attentionMask.ToArray();

        // Create Tensors with explicit dimensions
        var dimensions = new int[] { 1, MaxSequenceLength };
        
        // DenseTensor constructor expects (Memory<T>, ReadOnlySpan<int> dimensions)
        // We pass array (which implicitly converts to Memory) and array (implicitly to ReadOnlySpan)
        var inputIdsTensor = new DenseTensor<long>(inputIdsArray, dimensions);
        var attentionMaskTensor = new DenseTensor<long>(attentionMaskArray, dimensions);
        var tokenTypeIdsTensor = new DenseTensor<long>(tokenTypeIds, dimensions);

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIdsTensor),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMaskTensor),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIdsTensor)
        };

        using var results = _session.Run(inputs);
        // Output shape: [1, SequenceLength, 384]
        var outputTensor = results.First().AsTensor<float>(); 
        
        // Mean Pooling
        var embeddings = new float[EmbeddingDimension];
        int validCount = 0;

        // Iterate over sequence length (second dimension)
        // dimensions are [batch, seq, hidden]
        for (int i = 0; i < MaxSequenceLength; i++)
        {
            if (attentionMaskArray[i] == 1)
            {
                for (int j = 0; j < EmbeddingDimension; j++)
                {
                    // Access tensor by indices [0, i, j]
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

        // Normalize
        var norm = (float)Math.Sqrt(embeddings.Sum(x => x * x));
        if (norm > 1e-9) // Determine epsilon
        {
            for (int i = 0; i < embeddings.Length; i++)
            {
                embeddings[i] /= norm;
            }
        }

        return embeddings;
    }

    private List<long> Tokenize(string text)
    {
        var ids = new List<long>();
        // Normalize text (lowercase)
        text = text.ToLowerInvariant();
        
        // Basic pre-tokenization: split by whitespace and punctuation
        // Note: This is simplified. Real WordPiece handles punctuation splitting more robustly.
        // We'll replace punctuation with " {punct} " to ensure splitting.
        // For simplicity in this fix, we just split by whitespace after replacing some common punctuation.
        foreach (var c in new[] { '.', ',', '!', '?', ';', ':', '"', '\'', '(', ')', '[', ']' })
        {
            text = text.Replace(c.ToString(), $" {c} ");
        }
        
        var words = text.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var word in words)
        {
            // WordPiece algorithm
            int start = 0;
            while (start < word.Length)
            {
                int end = word.Length;
                string subword = null;
                bool found = false;

                while (end > start)
                {
                    subword = word.Substring(start, end - start);
                    if (start > 0)
                    {
                        subword = "##" + subword;
                    }

                    if (_vocab.TryGetValue(subword, out int id))
                    {
                        ids.Add(id);
                        start = end;
                        found = true;
                        break;
                    }
                    end--;
                }

                if (!found)
                {
                    ids.Add(_unkTokenId);
                    // Skip the char that caused unknown or whole word? 
                    // Usually we mark the whole remaining or just byte-fallback. 
                    // Simple approach: skip one char and try again or break word
                    start++; 
                    // Break word effectively map rest to UNK
                    break;
                }
            }
        }

        return ids;
    }

    public void Dispose()
    {
        _session?.Dispose();
    }
}
