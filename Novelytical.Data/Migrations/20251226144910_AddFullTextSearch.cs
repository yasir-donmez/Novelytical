using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFullTextSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. SearchVector kolonunu ekle (sadece yoksa)
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'Novels' AND column_name = 'SearchVector'
                    ) THEN
                        ALTER TABLE ""Novels"" ADD COLUMN ""SearchVector"" tsvector;
                    END IF;
                END $$;
            ");

            // 2. GIN Index oluştur (hızlı Full-Text arama için)
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS idx_novel_search 
                ON ""Novels"" USING GIN (""SearchVector"");
            ");

            // 3. Function oluştur (Türkçe + İngilizce)
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION update_novel_search_vector() 
                RETURNS trigger AS $$
                BEGIN
                  -- Türkçe ve İngilizce indexleme
                  NEW.""SearchVector"" := 
                    setweight(to_tsvector('turkish', COALESCE(NEW.""Title"", '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.""Title"", '')), 'A') ||
                    setweight(to_tsvector('turkish', COALESCE(NEW.""Description"", '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(NEW.""Description"", '')), 'B');
                  RETURN NEW;
                END
                $$ LANGUAGE plpgsql;
            ");

            // 4. Trigger oluştur (sadece yoksa)
            migrationBuilder.Sql(@"
                DROP TRIGGER IF EXISTS tsvector_update ON ""Novels"";
                CREATE TRIGGER tsvector_update 
                BEFORE INSERT OR UPDATE ON ""Novels""
                FOR EACH ROW EXECUTE FUNCTION update_novel_search_vector();
            ");

            // 5. Mevcut veriler için SearchVector doldur
            migrationBuilder.Sql(@"
                UPDATE ""Novels"" 
                SET ""Title"" = ""Title""
                WHERE ""SearchVector"" IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Trigger sil
            migrationBuilder.Sql(@"DROP TRIGGER IF EXISTS tsvector_update ON ""Novels"";");

            // 2. Function sil
            migrationBuilder.Sql(@"DROP FUNCTION IF EXISTS update_novel_search_vector();");

            // 3. Index sil
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS idx_novel_search;");

            // 4. Kolonu sil
            migrationBuilder.DropColumn(
                name: "SearchVector",
                table: "Novels");
        }
    }
}
