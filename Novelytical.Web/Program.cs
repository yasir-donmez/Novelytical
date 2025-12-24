using Microsoft.EntityFrameworkCore;
using Novelytical.Data; // Data projesini içeri alıyoruz

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, o => o.UseVector())); 

// Add services to the container.
// Add services to the container.
builder.Services.AddControllersWithViews();

// 🧠 Yapay Zeka Servisi (Singleton: Tek bir tane yaratılır, herkes onu kullanır)
// Bu sayede model her istekte tekrar tekrar yüklenmez, performans artar.
builder.Services.AddSingleton<SmartComponents.LocalEmbeddings.LocalEmbedder>();

var app = builder.Build();

// Configure the HTTP request pipeline.sdo
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


app.Run();
