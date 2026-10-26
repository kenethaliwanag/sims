using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SimsApi.Data;

namespace SimsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ActivityController : ControllerBase
{
    private readonly SimsDbContext _context;

    public ActivityController(SimsDbContext context)
    {
        _context = context;
    }

    // School Head monitoring feed: newest changes first.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetActivity([FromQuery] int limit = 100)
    {
        limit = Math.Clamp(limit, 1, 500);

        var logs = await _context.ActivityLogs
            .OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.Id)
            .Take(limit)
            .ToListAsync();

        // Stored as UTC; marking it keeps the browser from shifting the timestamp.
        return logs.Select(a => (object)new
        {
            a.Id,
            a.ActorName,
            a.ActorRole,
            a.Action,
            a.Description,
            CreatedAt = DateTime.SpecifyKind(a.CreatedAt, DateTimeKind.Utc)
        }).ToList();
    }
}
