using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRatingCriteriaAndReorder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RatingCharacters",
                table: "Novels",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingFlow",
                table: "Novels",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingGrammar",
                table: "Novels",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingStory",
                table: "Novels",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingWorld",
                table: "Novels",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RatingCharacters",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "RatingFlow",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "RatingGrammar",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "RatingStory",
                table: "Novels");

            migrationBuilder.DropColumn(
                name: "RatingWorld",
                table: "Novels");
        }
    }
}
