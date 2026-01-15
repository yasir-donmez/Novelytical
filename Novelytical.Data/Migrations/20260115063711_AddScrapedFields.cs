using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScrapedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ScrapedRating",
                table: "Novels",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Novels",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "Novels",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScrapedRating",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "Novels");
        }
    }
}
