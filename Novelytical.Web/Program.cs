using Microsoft.EntityFrameworkCore;
using Novelytical.Application;  // 🚀 Application layer
using Novelytical.Data;          // 🚀 Data layer
using Novelytical.Web.Middleware; // Global Exception Handler
using Microsoft.AspNetCore.RateLimiting; // Rate Limiting
using System.Threading.RateLimiting; // Rate Limiting
using Microsoft.AspNetCore.HttpOverrides; // 🚀 Proxy Headers support
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;


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
    
    // Health Check servisi - Redis optional
    var healthChecksBuilder = builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString!);
    
    var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConnectionString) && redisConnectionString != "localhost:6379")
    {
        healthChecksBuilder.AddRedis(redisConnectionString);
    }

    // 🚀 Caching Strategy (Redis) - Production optimized
    var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConnectionString) && redisConnectionString != "localhost:6379")
    {
        builder.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
            options.InstanceName = "Novelytical_";
        });
    }
    else
    {
        // Fallback to in-memory cache if Redis not available
        builder.Services.AddMemoryCache();
        builder.Services.AddSingleton<Microsoft.Extensions.Caching.Distributed.IDistributedCache, 
            Microsoft.Extensions.Caching.Memory.MemoryDistributedCache>();
    }

    // Add services to the container.
    builder.Services.AddControllers();



    // 🌐 CORS - Frontend erişimi için
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            if (builder.Environment.IsDevelopment())
            {
                // Development: Allow any origin
                policy.SetIsOriginAllowed(origin => true)
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            }
            else
            {
                // Production: Only allow specific origins
                var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
                    ?? new[] { "https://your-domain.com" };
                
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            }
        });
    });

    // ⚡ Rate Limiting - API koruma
    var rateLimitDocs = builder.Configuration.GetSection("RateLimit");
    var permitLimit = rateLimitDocs.GetValue<int>("PermitLimit", 100);
    var windowMinutes = rateLimitDocs.GetValue<int>("WindowMinutes", 1);

    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("fixed", limiterOptions =>
        {
            limiterOptions.PermitLimit = permitLimit; // Configured limit
            limiterOptions.Window = TimeSpan.FromMinutes(windowMinutes); // Configured window
            limiterOptions.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
            limiterOptions.QueueLimit = 5;
        });

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    // 🔥 Firebase & Authentication Setup
    var serviceAccountPath = builder.Configuration["Firebase:ServiceAccountPath"] 
        ?? Path.Combine(builder.Environment.ContentRootPath, "serviceAccountKey.json");
    
    if (File.Exists(serviceAccountPath))
    {
        FirebaseApp.Create(new AppOptions()
        {
            Credential = GoogleCredential.FromFile(serviceAccountPath)
        });
    }
    else
    {
        Log.Warning("⚠️ serviceAccountKey.json not found! Firebase Admin SDK not initialized.");
    }

    var projectId = builder.Configuration["Firebase:ProjectId"] ?? "novelytical";
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = $"https://securetoken.google.com/{projectId}";
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = $"https://securetoken.google.com/{projectId}",
                ValidateAudience = true,
                ValidAudience = projectId,
                ValidateLifetime = true
            };
        });

    // 📚 Swagger - API Documentation
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();

    // Auto-Migration & Schema Fixer
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try {
            db.Database.Migrate();
        } catch { /* Ignore migration errors */ }

        // 🚑 EMERGENCY FIX: Removed
        // Manual SQL execution has been removed as per architectural review.
        // Schema changes are handled by EF Migrations.
        // Data cleanup (Slug fixes) should be run as a separate maintenance job, not on every startup.
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

    // 🔒 Security: HSTS & HTTPS Redirection
    // Proxy (Docker/Nginx) Headers Support - CRITICAL for Containerized Apps
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    });

    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts(); // 🔒 Force HTTPS in Production (Strict-Transport-Security)
    }

    app.UseHttpsRedirection(); // 🔒 Redirect HTTP to HTTPS
    
    // 🌐 CORS - Must be after UseHttpsRedirection and before UseRouting
    app.UseCors("AllowFrontend");
    
    // ⚡ Rate Limiting - Must be after CORS and before UseRouting
    app.UseRateLimiter();
    
    app.UseRouting();

    app.UseAuthentication(); // 🔐 Kimlik Doğrulama
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
