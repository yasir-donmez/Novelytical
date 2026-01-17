using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSlugToNovel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Novels",
                type: "text",
                nullable: false,
                defaultValue: "");

            // ⚡ Custom SQL to populate Slugs from Titles for existing data
            // Simple slugification: Lowercase, replace space with dash. 
            // Also append ID to ensure uniqueness initially.
            migrationBuilder.Sql(
                @"UPDATE ""Novels"" SET ""Slug"" = LOWER(REPLACE(""Title"", ' ', '-')) || '-' || ""Id"";");

            migrationBuilder.CreateIndex(
                name: "IX_Novels_Slug",
                table: "Novels",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Novels_Slug",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Novels");
        }
    }
}
