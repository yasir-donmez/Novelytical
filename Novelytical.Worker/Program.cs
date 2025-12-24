using Novelytical.Data; // Veri katmanını tanı
using Microsoft.EntityFrameworkCore; // Veritabanı araçlarını tanı
using Novelytical.Worker; // Worker sınıfını tanı

var builder = Host.CreateApplicationBuilder(args);

// 1. Veritabanı Bağlantısını Yapılandırıyoruz
// (Gizli kasadaki şifreyi alıp sisteme tanıtıyoruz)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, o => o.UseVector()));

// 2. Robotu (Worker) İşe Alıyoruz
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();