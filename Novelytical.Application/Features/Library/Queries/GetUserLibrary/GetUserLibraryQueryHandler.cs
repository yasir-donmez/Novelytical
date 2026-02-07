using MediatR;
using Google.Cloud.Firestore;
using Microsoft.EntityFrameworkCore;
using Novelytical.Application.DTOs;
using Novelytical.Application.Wrappers;
using Novelytical.Data;

namespace Novelytical.Application.Features.Library.Queries.GetUserLibrary;

public class GetUserLibraryQueryHandler : IRequestHandler<GetUserLibraryQuery, Response<List<UserLibraryDto>>>
{
    private readonly FirestoreDb _firestoreDb;
    private readonly AppDbContext _context;

    public GetUserLibraryQueryHandler(FirestoreDb firestoreDb, AppDbContext context)
    {
        _firestoreDb = firestoreDb;
        _context = context;
    }

    public async Task<Response<List<UserLibraryDto>>> Handle(GetUserLibraryQuery request, CancellationToken cancellationToken)
    {
        try
        {
            string targetUserId = request.TargetUserId;
            string? requesterUserId = request.RequesterUserId;

            // 1. Check Privacy Settings (Firestore)
            var userDocRef = _firestoreDb.Collection("users").Document(targetUserId);
            var userSnapshot = await userDocRef.GetSnapshotAsync(cancellationToken);

            if (!userSnapshot.Exists) return new Response<List<UserLibraryDto>>("Kullanıcı bulunamadı.");

            bool hideLibrary = false;
            bool privateProfile = false;
            bool restrictMutuals = false;

            if (userSnapshot.TryGetValue("privacySettings", out Dictionary<string, object> privacy))
            {
                if (privacy.TryGetValue("hideLibrary", out var hl) && hl is bool bHl) hideLibrary = bHl;
                if (privacy.TryGetValue("privateProfile", out var pp) && pp is bool bPp) privateProfile = bPp;
                if (privacy.TryGetValue("restrictContentToMutuals", out var rm) && rm is bool bRm) restrictMutuals = bRm;
            }

            bool isOwner = targetUserId == requesterUserId;

            // Rule 1: Hide Library -> Only Owner can see
            if (hideLibrary && !isOwner)
            {
                return new Response<List<UserLibraryDto>>("Bu kullanıcının kütüphanesi gizli.") { Succeeded = false };
            }

            // Rule 2: Private Profile -> Must Follow (or Mutual)
            if (privateProfile && !isOwner)
            {
                if (string.IsNullOrEmpty(requesterUserId)) 
                    return new Response<List<UserLibraryDto>>("Bu profil gizli. Görmek için takip etmelisiniz.") { Succeeded = false };

                // Check if requester follows target
                var followQuery = _firestoreDb.Collection("follows")
                    .WhereEqualTo("followerId", requesterUserId)
                    .WhereEqualTo("followingId", targetUserId)
                    .Limit(1);
                
                var followSnap = await followQuery.GetSnapshotAsync(cancellationToken);
                bool isFollowing = followSnap.Count > 0;

                if (!isFollowing)
                     return new Response<List<UserLibraryDto>>("Bu profil gizli. Görmek için takip etmelisiniz.") { Succeeded = false };

                // Rule 3: Restrict to Mutuals
                if (restrictMutuals)
                {
                     var mutualQuery = _firestoreDb.Collection("follows")
                        .WhereEqualTo("followerId", targetUserId)
                        .WhereEqualTo("followingId", requesterUserId)
                        .Limit(1);
                    var mutualSnap = await mutualQuery.GetSnapshotAsync(cancellationToken);
                    if (mutualSnap.Count == 0)
                        return new Response<List<UserLibraryDto>>("Bu profil sadece karşılıklı takipleştiği kişilere açık.") { Succeeded = false };
                }
            }

            // 2. Fetch Library (Firestore)
            var libraryQuery = _firestoreDb.Collection("libraries")
                .WhereEqualTo("userId", targetUserId);

            var librarySnap = await libraryQuery.GetSnapshotAsync(cancellationToken);
            var libraryList = new List<UserLibraryDto>();
            
            foreach (var doc in librarySnap.Documents)
            {
                var data = doc.ToDictionary();
                
                int novelId = 0;
                if (data.TryGetValue("novelId", out var nid) && nid is long lNid) novelId = (int)lNid;
                else if (data.TryGetValue("novelId", out var nidInt) && nidInt is int iNid) novelId = iNid;

                // Try to find in Postgres for details if missing in Firestore
                string? title = data.ContainsKey("novelTitle") ? data["novelTitle"].ToString() : null;
                string? slug = data.ContainsKey("slug") ? data["slug"].ToString() : null;
                string? cover = data.ContainsKey("coverUrl") ? data["coverUrl"].ToString() : null;

                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(slug))
                {
                    // Fallback to Postgres for metadata
                    var pgNovel = await _context.Novels.FirstOrDefaultAsync(n => n.Id == novelId, cancellationToken);
                    if (pgNovel != null)
                    {
                        title = pgNovel.Title;
                        slug = pgNovel.Slug;
                        cover = pgNovel.CoverUrl;
                    }
                }

                libraryList.Add(new UserLibraryDto
                {
                    NovelId = novelId,
                    NovelTitle = title ?? "Bilinmeyen",
                    NovelSlug = slug ?? novelId.ToString(),
                    CoverImage = cover,
                    Status = data.ContainsKey("status") ?  MapStatus(data["status"].ToString()!) : 0, 
                    CurrentChapter = data.ContainsKey("currentChapter") ? Convert.ToInt32(data["currentChapter"]) : 0,
                    AddedAt = data.ContainsKey("updatedAt") ? ((Timestamp)data["updatedAt"]).ToDateTime() : DateTime.MinValue
                });
            }

            return new Response<List<UserLibraryDto>>(libraryList.OrderByDescending(x => x.AddedAt).ToList());
        }
        catch (Exception ex)
        {
            return new Response<List<UserLibraryDto>>($"Hata: {ex.Message}");
        }
    }

    private int MapStatus(string status)
    {
        return status switch
        {
            "reading" => 1,
            "completed" => 2,
            "plan_to_read" => 3,
            _ => 0
        };
    }
}
