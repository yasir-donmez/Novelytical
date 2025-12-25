using Novelytical.Data; // Veri katmanını tanı
using Microsoft.EntityFrameworkCore; // Veritabanı araçlarını tanı
using Novelytical.Worker; // Worker sınıfını tanı


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

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString, o => o.UseVector()));

    // 2. Robotu (Worker) İşe Alıyoruz
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