using Microsoft.EntityFrameworkCore;
using Novelytical.Data; // Data projesini içeri alıyoruz


using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.Seq(context.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341"));

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString, o => o.UseVector())); 

    // Health Check servisi
    builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString);

    // Add services to the container.
    builder.Services.AddControllersWithViews();

    // 🧠 Yapay Zeka Servisi (Singleton: Tek bir tane yaratılır, herkes onu kullanır)
    // Bu sayede model her istekte tekrar tekrar yüklenmez, performans artar.
    builder.Services.AddSingleton<SmartComponents.LocalEmbeddings.LocalEmbedder>();

    var app = builder.Build();

    // Auto-Migration
    // Veritabanı yoksa oluşturur, varsa eksik tabloları ekler.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }

    // Configure the HTTP request pipeline.
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler("/Home/Error");
        // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
        app.UseHsts();
    }

    app.UseHttpsRedirection();
    app.UseRouting();

    app.UseAuthorization();

    app.MapStaticAssets();

    app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}")
        .WithStaticAssets();

    // Health check endpoint'i
    app.MapHealthChecks("/health");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
