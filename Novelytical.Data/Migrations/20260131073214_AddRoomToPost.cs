using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novelytical.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomToPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParticipantCount",
                table: "CommunityPosts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoomTitle",
                table: "CommunityPosts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ParticipantCount",
                table: "CommunityPosts");

            migrationBuilder.DropColumn(
                name: "RoomTitle",
                table: "CommunityPosts");
        }
    }
}
