namespace Novelytical.Data
{
    public class Tag
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        // İlişkiler: Bir etiket birden fazla romanda olabilir
        public List<NovelTag> NovelTags { get; set; } = new();
    }
}