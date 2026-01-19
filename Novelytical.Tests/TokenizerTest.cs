using Microsoft.ML.Tokenizers;

string modelPath = @"c:\Users\Yasir2.Prenses\Novelytical\Novelytical.Application\Resources\Embeddings\paraphrase-multilingual-MiniLM-L12-v2\sentencepiece.bpe.model";

try
{
    using var modelStream = File.OpenRead(modelPath);
    SentencePieceTokenizer tokenizer = SentencePieceTokenizer.Create(modelStream);
    
    Console.WriteLine("✅ Tokenizer loaded successfully!");
    
    string text = "Hello world, this is a test.";
    var encodedIds = tokenizer.EncodeToIds(text, true, true, true, true);
    
    Console.WriteLine($"✅ Text tokenized successfully!");
    Console.WriteLine($"Token count: {encodedIds.Count}");
    Console.WriteLine($"Token IDs: {string.Join(", ", encodedIds)}");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Error: {ex.Message}");
    Console.WriteLine($"Stack trace: {ex.StackTrace}");
}
