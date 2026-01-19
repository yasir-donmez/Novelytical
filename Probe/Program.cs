using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Reflection;
using Microsoft.ML.Tokenizers;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Probe
{
    class Program
    {
        private const int MaxSequenceLength = 128;
        private const int EmbeddingDimension = 384;
        private static SentencePieceTokenizer _tokenizer;
        private static InferenceSession _session;

        static void Main(string[] args)
        {
            string baseDir = @"c:\Users\Yasir2.Prenses\Novelytical\Novelytical.Application\Resources\Embeddings\paraphrase-multilingual-MiniLM-L12-v2";
            string modelPath = Path.Combine(baseDir, "model.onnx");
            string tokenizerPath = Path.Combine(baseDir, "sentencepiece.bpe.model");

            try 
            {
                Console.WriteLine("Loading model...");
                _session = new InferenceSession(modelPath);
                
                Console.WriteLine("Loading tokenizer...");
                using var stream = File.OpenRead(tokenizerPath);
                _tokenizer = SentencePieceTokenizer.Create(stream);

                // Default test cases
                var comparisons = new List<(string, string)>
                {
                    ("monster", "Reincarnated as a Monster"),
                    ("monster", "Non-humanoid Protagonist"),
                    ("canavar", "Reincarnated as a Monster"),
                    ("canavar", "Non-humanoid Protagonist"),
                    ("ant", "Insects"),
                    ("ant", "Non-humanoid Protagonist"),
                    ("karınca", "Insects")
                };

                foreach(var (query, tag) in comparisons)
                {
                    float[] v1 = GenerateEmbedding(query);
                    float[] v2 = GenerateEmbedding(tag);
                    double dist = ComputeCosineDistance(v1, v2);
                    
                    Console.WriteLine($"Distance '{query}' <-> '{tag}': {dist:F4} (Match < 0.60? {(dist < 0.60 ? "YES" : "NO")})");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex}");
            }
        }

        private static float[] GenerateEmbedding(string text)
        {
            // Tokenize
            var encodedIds = _tokenizer.EncodeToIds(text, true, true, true, true);
            var inputIds = encodedIds.Select(id => (long)id).ToList();
            
            // Truncate
            if (inputIds.Count > MaxSequenceLength)
                inputIds = inputIds.Take(MaxSequenceLength).ToList();

            // Pad
            int paddingLength = MaxSequenceLength - inputIds.Count;
            var attentionMask = Enumerable.Repeat(1L, inputIds.Count).ToList();
            var tokenTypeIds = Enumerable.Repeat(0L, MaxSequenceLength).ToArray(); 

            if (paddingLength > 0)
            {
                inputIds.AddRange(Enumerable.Repeat(0L, paddingLength));
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
                    embeddings[j] /= validCount;
            }

            // Normalize
            var norm = (float)Math.Sqrt(embeddings.Sum(x => x * x));
            if (norm > 1e-9)
            {
                for (int i = 0; i < embeddings.Length; i++)
                    embeddings[i] /= norm;
            }

            return embeddings;
        }

        private static double ComputeCosineDistance(float[] v1, float[] v2)
        {
            double dot = 0.0;
            double mag1 = 0.0;
            double mag2 = 0.0;

            for (int i = 0; i < v1.Length; i++)
            {
                dot += v1[i] * v2[i];
                mag1 += v1[i] * v1[i];
                mag2 += v2[i] * v2[i];
            }
            
            if (mag1 == 0 || mag2 == 0) return 1.0;

            double similarity = dot / (Math.Sqrt(mag1) * Math.Sqrt(mag2));
            return 1.0 - similarity; 
        }
    }
}
