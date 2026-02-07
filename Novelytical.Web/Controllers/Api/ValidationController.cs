using Microsoft.AspNetCore.Mvc;
using Novelytical.Web.Jobs;
using Hangfire;
using Microsoft.EntityFrameworkCore; // Added missing using

namespace Novelytical.Web.Controllers.Api;

[ApiController]
[Route("api/validation")]
public class ValidationController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IServiceProvider _sp;

    public ValidationController(
        IConfiguration config,
        IServiceProvider sp)
    {
        _config = config;
        _sp = sp;
    }

    [HttpPost("trigger-rankings")]
    public IActionResult TriggerRankings()
    {
        var manager = _sp.GetRequiredService<IRecurringJobManager>();
        manager.Trigger("update-rankings");
        return Ok(new { message = "Ranking update job triggered!" });
    }

    [HttpPost("trigger-rankings-sync")]
    public async Task<IActionResult> TriggerRankingsSync()
    {
        var job = _sp.GetRequiredService<UpdateRankingsJob>();
        await job.Execute();
        return Ok(new { message = "Ranking update completed successfully!" });
    }

    [HttpPost("fix-schema")]
    public async Task<IActionResult> FixSchema()
    {
        try 
        {
            var sql = @"
                ALTER TABLE ""Novels"" ADD COLUMN IF NOT EXISTS ""CommentCount"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""Novels"" ADD COLUMN IF NOT EXISTS ""ReviewCount"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""Novels"" ADD COLUMN IF NOT EXISTS ""SiteViewCount"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""Novels"" ADD COLUMN IF NOT EXISTS ""ScrapedRating"" numeric;
            ";

            // Method 1: Try Resolve AppDbContext
            using (var scope = _sp.CreateScope())
            {
                var db = scope.ServiceProvider.GetService<Novelytical.Data.AppDbContext>();
                if (db != null)
                {
                    await db.Database.ExecuteSqlRawAsync(sql);
                    return Ok(new { message = "Schema fixed successfully using EF Core!" });
                }
            }

            // Method 2: Fallback to Npgsql
            var connString = _config.GetConnectionString("DefaultConnection");
            using (var conn = new Npgsql.NpgsqlConnection(connString))
            {
                await conn.OpenAsync();
                using (var cmd = new Npgsql.NpgsqlCommand(sql, conn))
                {
                    await cmd.ExecuteNonQueryAsync();
                }
            }
            
            return Ok(new { message = "Schema fixed successfully using Npgsql Fallback!" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
        }
    }
}
