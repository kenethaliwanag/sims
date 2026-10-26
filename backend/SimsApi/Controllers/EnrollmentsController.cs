using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;
using SimsApi.Services;
using System.Security.Claims;

namespace SimsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly SimsDbContext _context;
    private readonly TeacherAccess _access;
    private readonly ActivityLogger _log;

    public EnrollmentsController(SimsDbContext context, TeacherAccess access, ActivityLogger log)
    {
        _context = context;
        _access = access;
        _log = log;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetEnrollments([FromQuery] int? schoolYearId, [FromQuery] string? scope)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);

        var query = _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.SchoolYear)
            .AsQueryable();

        if (schoolYearId.HasValue)
            query = query.Where(e => e.SchoolYearId == schoolYearId.Value);

        // Teachers see their advisees only. The Grades screen asks for scope=grading so it can also
        // list the sections they teach; every other screen stays advisory-only.
        int? currentTeacherId = null;
        if (role == "Teacher")
        {
            currentTeacherId = await _access.CurrentTeacherIdAsync(User);
            if (currentTeacherId == null)
                query = query.Where(e => false);
            else if (scope == "grading")
                query = _access.VisibleEnrollments(query, currentTeacherId.Value);
            else
                query = query.Where(e => e.TeacherId == currentTeacherId.Value);
        }

        return await query.OrderBy(e => e.GradeLevel).ThenBy(e => e.Section).Select(e => new {
            e.Id, e.GradeLevel, e.Section, e.EnrollmentDate,
            StudentId = e.StudentId,
            student = new { e.Student.Id, e.Student.FirstName, e.Student.LastName, e.Student.LRN, e.Student.Gender, e.Student.BirthDate },
            StudentName = e.Student.FirstName + " " + e.Student.LastName,
            LRN = e.Student.LRN,
            SchoolYear = e.SchoolYear.Year,
            SchoolYearId = e.SchoolYearId,
            TeacherId = e.TeacherId,
            TeacherName = e.Teacher != null ? e.Teacher.FirstName + " " + e.Teacher.LastName : null,
            // Only the adviser may edit or delete the enrollment/student pair.
            IsAdviser = currentTeacherId == null || e.TeacherId == currentTeacherId
        }).ToListAsync<object>();
    }

    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetEnrollmentStats([FromQuery] int? schoolYearId)
    {
        var activeYear = await _context.SchoolYears.FirstOrDefaultAsync(sy => sy.IsActive);
        var yearId = schoolYearId ?? activeYear?.Id;
        if (yearId == null) return NotFound("No active school year");

        var role = User.FindFirstValue(ClaimTypes.Role);

        var query = _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.SchoolYear)
            .Where(e => e.SchoolYearId == yearId);

        if (role == "Teacher")
        {
            var teacherId = await _access.CurrentTeacherIdAsync(User);
            // Dashboard count is the advisory class only.
            query = teacherId == null
                ? query.Where(e => false)
                : query.Where(e => e.TeacherId == teacherId.Value);
        }

        var enrollments = await query.ToListAsync();

        return new {
            totalEnrollees = enrollments.Count,
            maleCount = enrollments.Count(e => e.Student.Gender.ToLower() == "male"),
            femaleCount = enrollments.Count(e => e.Student.Gender.ToLower() == "female"),
            schoolYear = enrollments.FirstOrDefault()?.SchoolYear?.Year ?? ""
        };
    }

    // Teachers handle enrollment (per adviser/teacher). Admin: view only.
    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<object>> CreateEnrollment([FromBody] EnrollmentRequest request)
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

        // A teacher may only enroll into their own grade level; subject-teacher loads do not grant enrollment rights.
        if (user?.AssignedGradeLevel != null && request.GradeLevel != user.AssignedGradeLevel)
            return BadRequest($"You can only enroll students in {user.AssignedGradeLevel}");

        var teacherId = await _access.CurrentTeacherIdAsync(User);

        var student = await _context.Students.FindAsync(request.StudentId);
        if (student == null) return BadRequest("Student not found");

        var enrollment = new Enrollment
        {
            StudentId = request.StudentId,
            SchoolYearId = request.SchoolYearId,
            GradeLevel = request.GradeLevel,
            Section = request.Section,
            EnrollmentDate = DateTime.UtcNow,
            TeacherId = teacherId
        };

        if (await _context.Enrollments.AnyAsync(e => e.StudentId == enrollment.StudentId && e.SchoolYearId == enrollment.SchoolYearId))
            return BadRequest("Student already enrolled for this school year");

        _context.Enrollments.Add(enrollment);
        await _log.RecordAsync(User, "enrollment.created",
            $"enrolled {student.FirstName} {student.LastName} in {request.GradeLevel} — {request.Section}");
        await _context.SaveChangesAsync();
        return new { id = enrollment.Id, message = "Enrolled successfully" };
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> UpdateEnrollment(int id, EnrollmentRequest request)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound();

        var username = User.FindFirstValue(ClaimTypes.Name);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user?.AssignedGradeLevel != null && request.GradeLevel != user.AssignedGradeLevel)
            return BadRequest($"You can only enroll students in {user.AssignedGradeLevel}");

        if (enrollment.TeacherId != null && await _access.CurrentTeacherIdAsync(User) != enrollment.TeacherId)
            return Forbid();

        enrollment.GradeLevel = request.GradeLevel;
        enrollment.Section = request.Section;

        var student = await _context.Students.FindAsync(enrollment.StudentId);
        await _log.RecordAsync(User, "enrollment.updated",
            $"moved {student?.FirstName} {student?.LastName} to {request.GradeLevel} — {request.Section}");

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> DeleteEnrollment(int id)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound();

        if (enrollment.TeacherId != null && await _access.CurrentTeacherIdAsync(User) != enrollment.TeacherId)
            return Forbid();

        var student = await _context.Students.FindAsync(enrollment.StudentId);
        await _log.RecordAsync(User, "enrollment.deleted",
            $"removed the enrollment of {student?.FirstName} {student?.LastName} ({enrollment.GradeLevel} — {enrollment.Section})");

        _context.Enrollments.Remove(enrollment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    public class EnrollmentRequest
    {
        public int StudentId { get; set; }
        public int SchoolYearId { get; set; }
        public string GradeLevel { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
    }
}