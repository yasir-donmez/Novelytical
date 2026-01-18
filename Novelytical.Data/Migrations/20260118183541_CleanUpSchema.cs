using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class CleanUpSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CommentCount",
                table: "Novels",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ReviewCount",
                table: "Novels",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SiteViewCount",
                table: "Novels",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CommentCount",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "ReviewCount",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "SiteViewCount",
                table: "Novels");
        }
    }
}
