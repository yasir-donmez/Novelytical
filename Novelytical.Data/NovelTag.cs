namespace Novelytical.Data
{
    public class NovelTag
    {
        public int NovelId { get; set; }
        public Novel Novel { get; set; } = null!; // Roman referansı

        public int TagId { get; set; }
        public Tag Tag { get; set; } = null!; // Etiket referansı
    }
}