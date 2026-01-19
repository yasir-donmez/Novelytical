using Xunit;
using Microsoft.ML.Tokenizers;
using System.IO;
using System;

namespace Novelytical.Tests;

public class TokenizerCompatibilityTest
{
    [Fact]
    public void CanLoadSentencePieceModel()
    {
        // Path to the actual sentencepiece.bpe.model file
        string modelPath = @"c:\Users\Yasir2.Prenses\Novelytical\Novelytical.Application\Resources\Embeddings\paraphrase-multilingual-MiniLM-L12-v2\sentencepiece.bpe.model";
        
        Assert.True(File.Exists(modelPath), $"SentencePiece model file not found at {modelPath}");

        // Create the SentencePiece tokenizer using the .model file
        using var modelStream = File.OpenRead(modelPath);
        SentencePieceTokenizer tokenizer = SentencePieceTokenizer.Create(modelStream);

        Assert.NotNull(tokenizer);

        // Test with some sample text to ensure it actually works
        string text = "Hello world, this is a test.";
        var encodedIds = tokenizer.EncodeToIds(text, true, true, true, true);
        
        Assert.NotNull(encodedIds);
        Assert.NotEmpty(encodedIds);
    }
}
