using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;

namespace SimsApi.Controllers;

public class TeachingAssignmentRequest
{
    public int TeacherId { get; set; }
    public int SubjectId { get; set; }
    public string Section { get; set; } = string.Empty;
    // Omitted = active school year.
    public int? SchoolYearId { get; set; }
}

// Admin-only: the official teacher ↔ subject ↔ section load that drives grade-encoding permissions.
[ApiController]
[Route("api/teaching-assignments")]
[Authorize(Roles = "Admin")]
public class TeachingAssignmentsController : ControllerBase
{
    private readonly SimsDbContext _context;

    public TeachingAssignmentsController(SimsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAssignments([FromQuery] int? teacherId, [FromQuery] int? schoolYearId)
    {
        var query = _context.TeachingAssignments
            .Include(a => a.Teacher)
            .Include(a => a.Subject)
            .Include(a => a.SchoolYear)
            .AsQueryable();

        if (teacherId.HasValue) query = query.Where(a => a.TeacherId == teacherId.Value);
        if (schoolYearId.HasValue) query = query.Where(a => a.SchoolYearId == schoolYearId.Value);

        return await query
            .OrderBy(a => a.Teacher.LastName).ThenBy(a => a.Subject.GradeLevel).ThenBy(a => a.Subject.Name)
            .Select(a => new {
                a.Id,
                a.TeacherId,
                TeacherName = a.Teacher.FirstName + " " + a.Teacher.LastName,
                a.SubjectId,
                SubjectName = a.Subject.Name,
                GradeLevel = a.Subject.GradeLevel,
                a.Section,
                a.SchoolYearId,
                SchoolYear = a.SchoolYear.Year
            })
            .ToListAsync<object>();
    }

    [HttpPost]
    public async Task<IActionResult> CreateAssignment([FromBody] TeachingAssignmentRequest request)
    {
        if (await _context.Teachers.FindAsync(request.TeacherId) == null)
            return BadRequest("Teacher not found");
        if (await _context.Subjects.FindAsync(request.SubjectId) == null)
            return BadRequest("Subject not found");

        var section = request.Section?.Trim() ?? "";
        if (section.Length == 0) return BadRequest("Section is required");

        int schoolYearId;
        if (request.SchoolYearId.HasValue)
        {
            if (!await _context.SchoolYears.AnyAsync(sy => sy.Id == request.SchoolYearId.Value))
                return BadRequest("School year not found");
            schoolYearId = request.SchoolYearId.Value;
        }
        else
        {
            var activeYear = await _context.SchoolYears.FirstOrDefaultAsync(sy => sy.IsActive);
            if (activeYear == null) return BadRequest("No active school year");
            schoolYearId = activeYear.Id;
        }

        var exists = await _context.TeachingAssignments.AnyAsync(a =>
            a.TeacherId == request.TeacherId && a.SubjectId == request.SubjectId &&
            a.Section == section && a.SchoolYearId == schoolYearId);
        if (exists) return BadRequest("This teaching load already exists");

        var assignment = new TeachingAssignment
        {
            TeacherId = request.TeacherId,
            SubjectId = request.SubjectId,
            Section = section,
            SchoolYearId = schoolYearId
        };
        _context.TeachingAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAssignments), new { id = assignment.Id }, new { assignment.Id });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAssignment(int id)
    {
        var assignment = await _context.TeachingAssignments.FindAsync(id);
        if (assignment == null) return NotFound();

        _context.TeachingAssignments.Remove(assignment);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
