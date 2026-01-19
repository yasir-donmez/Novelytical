using Microsoft.ML.Tokenizers;

string modelPath = @"c:\Users\Yasir2.Prenses\Novelytical\Novelytical.Application\Resources\Embeddings\paraphrase-multilingual-MiniLM-L12-v2\sentencepiece.bpe.model";

Console.WriteLine("=== Microsoft.ML.Tokenizers Compatibility Test ===\n");

try
{
    Console.WriteLine($"Loading model from: {modelPath}");
    using var modelStream = File.OpenRead(modelPath);
    Tokenizer tokenizer = SentencePieceTokenizer.Create(modelStream);
    
    Console.WriteLine("✅ Tokenizer loaded successfully!\n");
    
    string text = "Hello world, this is a test.";
    Console.WriteLine($"Test text: '{text}'");
    var encoded = tokenizer.Encode(text);
    
    Console.WriteLine($"✅ Text tokenized successfully!");
    Console.WriteLine($"Token count: {encoded.Ids.Count}");
    Console.WriteLine($"Token IDs: [{string.Join(", ", encoded.Ids)}]");
    Console.WriteLine($"Tokens: [{string.Join(", ", encoded.Tokens)}]");
    
    Console.WriteLine("\n🎉 SUCCESS: Microsoft.ML.Tokenizers IS COMPATIBLE with this model!");
}
catch (Exception ex)
{
    Console.WriteLine($"\n❌ ERROR: {ex.GetType().Name}");
    Console.WriteLine($"Message: {ex.Message}");
    Console.WriteLine($"\nStack trace:\n{ex.StackTrace}");
    
    if (ex.InnerException != null)
    {
        Console.WriteLine($"\nInner exception: {ex.InnerException.Message}");
    }
}
