using Novelytical.Data; // Veri katmanını tanı
using Microsoft.EntityFrameworkCore; // Veritabanı araçlarını tanı
using Novelytical.Worker; // Worker sınıfını tanı
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
    // (Gizli kasadaki şifreyi alıp sisteme tanıtıyoruz)
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    // 1. Veritabanı ve Repository'leri Ekliyoruz (Data Layer)
    builder.Services.AddDataLayer(connectionString!);

    // 2. Uygulama Katmanını Ekliyoruz (Embedder vb. için)
    builder.Services.AddApplicationLayer();

    // 2.5 HTTP Client Ekle
    // 2.5 HTTP Client Ekle
    builder.Services.AddHttpClient();

    // 🚀 Redis Cache Ekle (Worker için de gerekli)
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
        options.InstanceName = "Novelytical_";
    });

    // 3. Robotu (Worker) İşe Alıyoruz
    builder.Services.AddHostedService<Worker>();

    var host = builder.Build();
    host.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Worker service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}