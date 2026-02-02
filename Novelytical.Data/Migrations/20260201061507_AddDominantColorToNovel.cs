using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDominantColorToNovel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DominantColor",
                table: "Novels",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Novels_LastUpdated",
                table: "Novels",
                column: "LastUpdated");

            migrationBuilder.CreateIndex(
                name: "IX_Novels_Rating",
                table: "Novels",
                column: "Rating");

            migrationBuilder.CreateIndex(
                name: "IX_Novels_Status",
                table: "Novels",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Novels_Status_Rating",
                table: "Novels",
                columns: new[] { "Status", "Rating" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityPosts_CreatedAt",
                table: "CommunityPosts",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Novels_LastUpdated",
                table: "Novels");

            migrationBuilder.DropIndex(
                name: "IX_Novels_Rating",
                table: "Novels");

            migrationBuilder.DropIndex(
                name: "IX_Novels_Status",
                table: "Novels");

            migrationBuilder.DropIndex(
                name: "IX_Novels_Status_Rating",
                table: "Novels");

            migrationBuilder.DropIndex(
                name: "IX_CommunityPosts_CreatedAt",
                table: "CommunityPosts");

            migrationBuilder.DropColumn(
                name: "DominantColor",
                table: "Novels");
        }
    }
}
