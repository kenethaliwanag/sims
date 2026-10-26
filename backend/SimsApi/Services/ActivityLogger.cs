using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;
using System.Security.Claims;

namespace SimsApi.Services;

// Records what teachers (and admins) change, so the School Head can monitor activity.
public class ActivityLogger
{
    private readonly SimsDbContext _db;

    public ActivityLogger(SimsDbContext db) => _db = db;

    // Adds the entry only; the caller's SaveChanges persists it in the same transaction as the change.
    public async Task RecordAsync(ClaimsPrincipal user, string action, string description)
    {
        var username = user.FindFirstValue(ClaimTypes.Name);
        var account = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);

        var name = account?.FullName ?? username ?? "Unknown";
        if (account?.TeacherId is int teacherId)
        {
            var teacher = await _db.Teachers.FindAsync(teacherId);
            if (teacher != null) name = $"{teacher.FirstName} {teacher.LastName}";
        }

        _db.ActivityLogs.Add(new ActivityLog
        {
            ActorName = name,
            ActorRole = account?.Role ?? "",
            Action = action,
            Description = description
        });
    }
}
