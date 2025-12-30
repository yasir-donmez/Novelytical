using Microsoft.EntityFrameworkCore;
using Novelytical.Application;  // 🚀 Application layer
using Novelytical.Data;          // 🚀 Data layer
using Novelytical.Web.Middleware; // Global Exception Handler
using Microsoft.AspNetCore.RateLimiting; // Rate Limiting
using System.Threading.RateLimiting; // Rate Limiting


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
    
    // 🚀 Phase 2: Clean Architecture Layers
    builder.Services.AddDataLayer(connectionString!);          // Data layer (DbContext, Repositories)
    builder.Services.AddApplicationLayer();                    // Application layer (Services, Cache)
    
    // Health Check servisi
    builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString);

    // Add services to the container.
    builder.Services.AddControllers();



    // 🌐 CORS - Frontend erişimi için
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.SetIsOriginAllowed(origin => true) // Allow any origin for dev
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
    });

    // ⚡ Rate Limiting - API koruma
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("fixed", limiterOptions =>
        {
            limiterOptions.PermitLimit = 100; // 100 requests
            limiterOptions.Window = TimeSpan.FromMinutes(1); // per minute
            limiterOptions.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
            limiterOptions.QueueLimit = 5;
        });

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    // 📚 Swagger - API Documentation
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();

    // Auto-Migration
    // Veritabanı yoksa oluşturur, varsa eksik tabloları ekler.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }

    // ⚠️ Global Exception Handler - Must be FIRST middleware
    app.UseGlobalExceptionHandler();

    // Configure the HTTP request pipeline.
    // (No MVC error handler needed for pure API)
    
    // 📚 Swagger UI (Development only)
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Novelytical API v1");
            c.RoutePrefix = "swagger"; // /swagger
        });
    }

    // app.UseHttpsRedirection();
    
    // 🌐 CORS - Must be after UseHttpsRedirection and before UseRouting
    app.UseCors("AllowFrontend");
    
    // ⚡ Rate Limiting - Must be after CORS and before UseRouting
    app.UseRateLimiter();
    
    app.UseRouting();

    app.UseAuthorization();

    app.MapControllers();

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
