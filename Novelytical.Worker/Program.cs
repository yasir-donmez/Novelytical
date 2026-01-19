using Novelytical.Data;
using Novelytical.Worker;
using Novelytical.Application;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = Host.CreateApplicationBuilder(args);

    builder.Services.AddSerilog((services, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.Seq(builder.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341"));

    // 1. Veritabanı Bağlantısını Yapılandırıyoruz
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    // 2. Veritabanı ve Repository'leri Ekliyoruz (Data Layer)
    builder.Services.AddDataLayer(connectionString!);

    // 3. Uygulama Katmanını Ekliyoruz (Embedder vb. için)
    builder.Services.AddApplicationLayer();

    // 4. HTTP Client Ekle
    builder.Services.AddHttpClient();

    // 5. Redis Cache Ekle
    var redisUrl = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    
    // Upstash URL formatını StackExchange.Redis formatına çevir
    // redis://default:password@host:port -> host:port,password=password,ssl=true
    if (redisUrl.StartsWith("redis://") || redisUrl.StartsWith("rediss://"))
    {
        var uri = new Uri(redisUrl);
        var password = uri.UserInfo.Split(':').LastOrDefault() ?? "";
        var redisHost = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 6379;
        var useSsl = redisUrl.StartsWith("rediss://") || redisHost.Contains("upstash");
        
        redisUrl = $"{redisHost}:{port},password={password},ssl={useSsl},abortConnect=false";
    }
    
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisUrl;
        options.InstanceName = "Novelytical_";
    });

    // 6. Worker'ı İşe Al
    builder.Services.AddHostedService<Worker>();

    var host = builder.Build();
    
    // GitHub Actions için: Worker tamamlandığında uygulama kapanacak
    await host.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Worker service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}