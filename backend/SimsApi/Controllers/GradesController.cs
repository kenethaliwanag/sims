using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;
using SimsApi.Services;
using System.Security.Claims;

namespace SimsApi.Controllers;

public class GradeUpdateDto
{
    public int Id { get; set; }
    public decimal? FirstQuarter { get; set; }
    public decimal? SecondQuarter { get; set; }
    public decimal? ThirdQuarter { get; set; }
    public decimal? FourthQuarter { get; set; }
}

public class GradeCreateDto
{
    public int EnrollmentId { get; set; }
    public int SubjectId { get; set; }
    public decimal? FirstQuarter { get; set; }
    public decimal? SecondQuarter { get; set; }
    public decimal? ThirdQuarter { get; set; }
    public decimal? FourthQuarter { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GradesController : ControllerBase
{
    private readonly SimsDbContext _context;
    private readonly TeacherAccess _access;
    private readonly ActivityLogger _log;

    public GradesController(SimsDbContext context, TeacherAccess access, ActivityLogger log)
    {
        _context = context;
        _access = access;
        _log = log;
    }

    [HttpGet("subjects")]
    public async Task<ActionResult<IEnumerable<Subject>>> GetSubjects([FromQuery] string? gradeLevel)
    {
        var query = _context.Subjects.AsQueryable();
        if (!string.IsNullOrEmpty(gradeLevel))
            query = query.Where(s => s.GradeLevel == gradeLevel);
        return await query.OrderBy(s => s.Name).ToListAsync();
    }

    // Subjects this user may encode for the selected enrollment: adviser gets all, subject teacher gets their load.
    [HttpGet("my-subjects/{enrollmentId}")]
    public async Task<ActionResult<object>> GetMySubjects(int enrollmentId)
    {
        var enrollment = await _context.Enrollments.FindAsync(enrollmentId);
        if (enrollment == null) return NotFound();

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "Admin")
        {
            var all = await _context.Subjects
                .Where(s => s.GradeLevel == enrollment.GradeLevel)
                .OrderBy(s => s.Name)
                .Select(s => new { s.Id, s.Name })
                .ToListAsync();
            return Ok(new { isAdviser = false, subjectIds = all.Select(s => s.Id), subjects = all });
        }

        var teacherId = await _access.CurrentTeacherIdAsync(User);
        if (teacherId == null || !await _access.CanViewAsync(enrollment, teacherId.Value))
            return Forbid();

        var subjects = await _access.AllowedSubjectsAsync(enrollment, teacherId.Value);
        var subjectIds = await _access.EncodableSubjectIdsAsync(enrollment, teacherId.Value);
        return Ok(new
        {
            isAdviser = _access.IsAdviser(enrollment, teacherId.Value),
            subjectIds,
            subjects = subjects.Select(s => new { s.Id, s.Name })
        });
    }

    // Classes this teacher can encode in: advisory section(s) plus assigned subject/section loads.
    [HttpGet("my-classes")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyClasses()
    {
        var teacherId = await _access.CurrentTeacherIdAsync(User);
        if (teacherId == null) return Ok(Array.Empty<object>());

        var advisory = await _context.Enrollments
            .Where(e => e.TeacherId == teacherId)
            .Select(e => new { e.GradeLevel, e.Section })
            .Distinct()
            .OrderBy(c => c.GradeLevel).ThenBy(c => c.Section)
            .ToListAsync();

        var loads = await _context.TeachingAssignments
            .Where(a => a.TeacherId == teacherId)
            .OrderBy(a => a.Subject.GradeLevel).ThenBy(a => a.Subject.Name).ThenBy(a => a.Section)
            .Select(a => new {
                a.SubjectId,
                SubjectName = a.Subject.Name,
                GradeLevel = a.Subject.GradeLevel,
                a.Section,
                SchoolYear = a.SchoolYear.Year
            })
            .ToListAsync();

        var classes = new List<object>();
        foreach (var c in advisory)
            classes.Add(new {
                isAdviser = true,
                subjectId = (int?)null,
                subjectName = "Advisory",
                c.GradeLevel,
                c.Section,
                SchoolYear = (string?)null
            });
        foreach (var l in loads)
            classes.Add(new {
                isAdviser = false,
                subjectId = (int?)l.SubjectId,
                l.SubjectName,
                l.GradeLevel,
                l.Section,
                l.SchoolYear
            });

        return Ok(classes);
    }

    [HttpGet("enrollment/{enrollmentId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetGradesByEnrollment(int enrollmentId)
    {
        var enrollment = await _context.Enrollments.FindAsync(enrollmentId);
        if (enrollment == null) return NotFound();

        var query = _context.Grades.Where(g => g.EnrollmentId == enrollmentId);

        if (User.FindFirstValue(ClaimTypes.Role) != "Admin")
        {
            var teacherId = await _access.CurrentTeacherIdAsync(User);
            if (teacherId == null || !await _access.CanViewAsync(enrollment, teacherId.Value))
                return Forbid();

            if (!_access.IsAdviser(enrollment, teacherId.Value))
            {
                var tid = teacherId.Value;
                query = query.Where(g => _context.TeachingAssignments.Any(a =>
                    a.TeacherId == tid && a.SubjectId == g.SubjectId &&
                    a.Section == enrollment.Section && a.SchoolYearId == enrollment.SchoolYearId));
            }
        }

        return await query
            .Select(g => new {
                g.Id,
                g.SubjectId,
                g.FirstQuarter, g.SecondQuarter, g.ThirdQuarter, g.FourthQuarter,
                g.Remarks,
                FinalRating = Math.Round(((g.FirstQuarter ?? 0m) + (g.SecondQuarter ?? 0m) + (g.ThirdQuarter ?? 0m) + (g.FourthQuarter ?? 0m)) / 4, 2),
                subject = new { Name = _context.Subjects.Where(s => s.Id == g.SubjectId).Select(s => s.Name).FirstOrDefault() }
            })
            .ToListAsync();
    }

    private static void ApplyDepEdRating(Grade g)
    {
        var quarters = new[] { g.FirstQuarter, g.SecondQuarter, g.ThirdQuarter, g.FourthQuarter };
        foreach (var q in quarters)
        {
            if (q.HasValue)
            {
                if (q.Value < 60 || q.Value > 100)
                    throw new ArgumentException("Quarterly grade must be between 60 and 100 (DepEd whole-number scale)");
            }
        }
        if (g.FirstQuarter.HasValue && g.SecondQuarter.HasValue && g.ThirdQuarter.HasValue && g.FourthQuarter.HasValue)
        {
            g.FinalRating = Math.Round((g.FirstQuarter.Value + g.SecondQuarter.Value + g.ThirdQuarter.Value + g.FourthQuarter.Value) / 4, 2);
            g.Remarks = g.FinalRating >= 75 ? "PASSED" : "FAILED";
        }
    }

    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<object>> CreateGrade(GradeCreateDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(dto.EnrollmentId);
        if (enrollment == null) return NotFound("Enrollment not found");

        var teacherId = await _access.CurrentTeacherIdAsync(User);
        if (teacherId == null || !await _access.CanEncodeAsync(enrollment, dto.SubjectId, teacherId.Value))
            return Forbid();

        var subject = await _context.Subjects.FindAsync(dto.SubjectId);
        if (subject == null) return BadRequest("Subject not found");
        var student = await _context.Students.FindAsync(enrollment.StudentId);

        var grade = new Grade
        {
            EnrollmentId = dto.EnrollmentId,
            SubjectId = dto.SubjectId,
            FirstQuarter = dto.FirstQuarter,
            SecondQuarter = dto.SecondQuarter,
            ThirdQuarter = dto.ThirdQuarter,
            FourthQuarter = dto.FourthQuarter
        };
        ApplyDepEdRating(grade);

        if (await _context.Grades.AnyAsync(g => g.EnrollmentId == grade.EnrollmentId && g.SubjectId == grade.SubjectId))
            return BadRequest("Grade already exists for this subject");

        grade.UpdatedAt = DateTime.UtcNow;
        _context.Grades.Add(grade);
        await _log.RecordAsync(User, "grade.created",
            $"encoded {subject.Name} for {student?.FirstName} {student?.LastName} ({enrollment.GradeLevel} — {enrollment.Section})");
        await _context.SaveChangesAsync();

        // Return a plain projection: serializing the entity causes a JSON cycle via Enrollment.Grades.
        return Ok(new {
            grade.Id, grade.EnrollmentId, grade.SubjectId,
            grade.FirstQuarter, grade.SecondQuarter, grade.ThirdQuarter, grade.FourthQuarter,
            grade.FinalRating, grade.Remarks
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> UpdateGrade(int id, [FromBody] GradeUpdateDto dto)
    {
        var existing = await _context.Grades.FindAsync(id);
        if (existing == null) return NotFound();
        if (id != dto.Id) return BadRequest();

        var enrollment = await _context.Enrollments.FindAsync(existing.EnrollmentId);
        if (enrollment == null) return NotFound();

        var teacherId = await _access.CurrentTeacherIdAsync(User);
        if (teacherId == null || !await _access.CanEncodeAsync(enrollment, existing.SubjectId, teacherId.Value))
            return Forbid();

        if (dto.FirstQuarter.HasValue) existing.FirstQuarter = dto.FirstQuarter;
        if (dto.SecondQuarter.HasValue) existing.SecondQuarter = dto.SecondQuarter;
        if (dto.ThirdQuarter.HasValue) existing.ThirdQuarter = dto.ThirdQuarter;
        if (dto.FourthQuarter.HasValue) existing.FourthQuarter = dto.FourthQuarter;

        ApplyDepEdRating(existing);
        existing.UpdatedAt = DateTime.UtcNow;

        var subject = await _context.Subjects.FindAsync(existing.SubjectId);
        var student = await _context.Students.FindAsync(enrollment.StudentId);
        var final = existing.FinalRating.HasValue ? $" — final {existing.FinalRating} {existing.Remarks}" : "";
        await _log.RecordAsync(User, "grade.updated",
            $"updated {subject?.Name} for {student?.FirstName} {student?.LastName} ({enrollment.GradeLevel} — {enrollment.Section}){final}");

        _context.Entry(existing).State = EntityState.Modified;

        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Grades.AnyAsync(g => g.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> DeleteGrade(int id)
    {
        var grade = await _context.Grades.FindAsync(id);
        if (grade == null) return NotFound();

        var enrollment = await _context.Enrollments.FindAsync(grade.EnrollmentId);
        if (enrollment == null) return NotFound();

        var teacherId = await _access.CurrentTeacherIdAsync(User);
        if (teacherId == null || !await _access.CanEncodeAsync(enrollment, grade.SubjectId, teacherId.Value))
            return Forbid();

        var subject = await _context.Subjects.FindAsync(grade.SubjectId);
        var student = await _context.Students.FindAsync(enrollment.StudentId);
        await _log.RecordAsync(User, "grade.deleted",
            $"deleted the {subject?.Name} grade for {student?.FirstName} {student?.LastName} ({enrollment.GradeLevel} — {enrollment.Section})");

        _context.Grades.Remove(grade);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
