namespace Novelytical.Web.Models
{
    public class StatisticsViewModel
    {
        public int TotalNovels { get; set; }

        // HATA ÇÖZÜMÜ: = ""; ekleyerek başlangıç değerini boş yapıyoruz.
        public string AverageRating { get; set; } = ""; 

        public int TotalChapters { get; set; }
        
        public Dictionary<string, int> TopTags { get; set; } = new();
    }
}