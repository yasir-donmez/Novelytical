using Novelytical.Data;
using Novelytical.Worker;
using Novelytical.Application;
using Novelytical.Worker.Services;
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

    // Neon URL formatını Npgsql formatına çevir
    // postgresql://user:password@host/db?sslmode=require -> Host=...;Database=...;Username=...;Password=...;SSL Mode=Require
    if (connectionString?.StartsWith("postgresql://") == true || connectionString?.StartsWith("postgres://") == true)
    {
        var uri = new Uri(connectionString);
        var userInfo = uri.UserInfo.Split(':');
        var username = userInfo.Length > 0 ? userInfo[0] : "";
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        var database = uri.AbsolutePath.TrimStart('/');
        var pgHost = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        
        // Query string'den sslmode'u al (manuel parsing)
        var queryParams = uri.Query.TrimStart('?').Split('&')
            .Select(p => p.Split('='))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0], p => p[1], StringComparer.OrdinalIgnoreCase);
        var sslMode = queryParams.GetValueOrDefault("sslmode", "require");
        var sslModeNpgsql = sslMode.ToLower() switch
        {
            "require" => "Require",
            "verify-full" => "VerifyFull",
            "verify-ca" => "VerifyCA",
            "prefer" => "Prefer",
            "disable" => "Disable",
            _ => "Require"
        };
        
        connectionString = $"Host={pgHost};Port={port};Database={database};Username={username};Password={password};SSL Mode={sslModeNpgsql}";
        Log.Information("📦 PostgreSQL URL formatı Npgsql formatına çevrildi. Host: {Host}", pgHost);
    }

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

    // 6. Firebase & Notification Service
    var serviceAccountPath = builder.Configuration["Firebase:ServiceAccountPath"] 
        ?? Path.Combine(builder.Environment.ContentRootPath, "serviceAccountKey.json");
    
    if (File.Exists(serviceAccountPath))
    {
        FirebaseAdmin.FirebaseApp.Create(new FirebaseAdmin.AppOptions()
        {
            Credential = Google.Apis.Auth.OAuth2.GoogleCredential.FromFile(serviceAccountPath),
            ProjectId = builder.Configuration["Firebase:ProjectId"] ?? "novelytical"
        });
        
        builder.Services.AddSingleton<FirebaseNotificationService>();
    }
    else
    {
        Log.Warning("⚠️ serviceAccountKey.json not found! Notifications disabled.");
    }

    // 7. Worker'ı İşe Al
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