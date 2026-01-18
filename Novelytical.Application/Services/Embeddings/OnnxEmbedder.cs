using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Novelytical.Application.Interfaces;

namespace Novelytical.Application.Services.Embeddings;

/// <summary>
/// ONNX-based text embedder with multilingual support
/// Uses paraphrase-multilingual-MiniLM-L12-v2 model with manual SentencePiece tokenization
/// </summary>
public class OnnxEmbedder : IEmbedder, IDisposable
{
    private readonly InferenceSession _session;
    private readonly ILogger<OnnxEmbedder> _logger;
    private Dictionary<string, int> _vocab = new();
    private const int MaxSequenceLength = 128;
    private const int EmbeddingDimension = 384;
    private int _clsTokenId;
    private int _sepTokenId;
    private int _padTokenId;
    private int _unkTokenId;
    private bool _isSentencePiece;

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

            if (root.TryGetProperty("model", out var model) && model.TryGetProperty("vocab", out var vocabElement))
            {
                _vocab = new Dictionary<string, int>();
                
                if (vocabElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    int index = 0;
                    foreach (var item in vocabElement.EnumerateArray())
                    {
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

            _isSentencePiece = _vocab.Keys.Any(k => k.Contains("\u2581"));

            if (_isSentencePiece)
            {
                _clsTokenId = _vocab.GetValueOrDefault("<s>", 0);
                _sepTokenId = _vocab.GetValueOrDefault("</s>", 2); 
                _unkTokenId = _vocab.GetValueOrDefault("<unk>", 3);
                _padTokenId = _vocab.GetValueOrDefault("<pad>", 1);
            }
            else
            {
                _clsTokenId = _vocab.GetValueOrDefault("[CLS]", 101); 
                _sepTokenId = _vocab.GetValueOrDefault("[SEP]", 102);
                _padTokenId = _vocab.GetValueOrDefault("[PAD]", 0);
                _unkTokenId = _vocab.GetValueOrDefault("[UNK]", 100);
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
        
        var inputIds = new List<long> { _clsTokenId };
        inputIds.AddRange(tokens);
        inputIds.Add(_sepTokenId);

        if (inputIds.Count > MaxSequenceLength)
        {
            inputIds = inputIds.Take(MaxSequenceLength - 1).ToList();
            inputIds.Add(_sepTokenId);
        }

        int paddingLength = MaxSequenceLength - inputIds.Count;
        var attentionMask = Enumerable.Repeat(1L, inputIds.Count).ToList();
        var tokenTypeIds = Enumerable.Repeat(0L, MaxSequenceLength).ToArray(); 

        if (paddingLength > 0)
        {
            inputIds.AddRange(Enumerable.Repeat((long)_padTokenId, paddingLength));
            attentionMask.AddRange(Enumerable.Repeat(0L, paddingLength));
        }

        var inputIdsArray = inputIds.ToArray();
        var attentionMaskArray = attentionMask.ToArray();

        var dimensions = new int[] { 1, MaxSequenceLength };
        
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

    private List<long> Tokenize(string text)
    {
        var ids = new List<long>();
        text = text.ToLowerInvariant();
        
        if (_isSentencePiece)
        {
            text = text.Replace(" ", "\u2581");
            
            if (!text.StartsWith("\u2581"))
                text = "\u2581" + text;

            int i = 0;
            while (i < text.Length)
            {
                bool matched = false;
                for (int len = Math.Min(text.Length - i, 25); len > 0; len--)
                {
                    var substr = text.Substring(i, len);
                    if (_vocab.TryGetValue(substr, out int id))
                    {
                        ids.Add(id);
                        i += len;
                        matched = true;
                        break;
                    }
                }
                
                if (!matched)
                {
                    ids.Add(_unkTokenId);
                    i++;
                }
            }
        }
        else
        {
            foreach (var c in new[] { '.', ',', '!', '?', ';', ':', '"', '\'', '(', ')', '[', ']' })
            {
                text = text.Replace(c.ToString(), $" {c} ");
            }
            
            var words = text.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (var word in words)
            {
                int start = 0;
                while (start < word.Length)
                {
                    int end = word.Length;
                    string? subword = null;
                    bool found = false;

                    while (end > start)
                    {
                        subword = word.Substring(start, end - start);
                        if (start > 0) subword = "##" + subword;

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
                        start++;
                        break;
                    }
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
