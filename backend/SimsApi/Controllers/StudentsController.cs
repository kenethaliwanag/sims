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
public class StudentsController : ControllerBase
{
    private readonly SimsDbContext _context;
    private readonly TeacherAccess _access;
    private readonly ActivityLogger _log;

    public StudentsController(SimsDbContext context, TeacherAccess access, ActivityLogger log)
    {
        _context = context;
        _access = access;
        _log = log;
    }

    // Admin: view all. Teacher: advisees only — taught sections roster lives in the Grades screen.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetStudents()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);

        IQueryable<Student> query = _context.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.SchoolYear)
            .Include(s => s.Enrollments).ThenInclude(e => e.Teacher)
            .OrderBy(s => s.LastName);

        if (role == "Teacher")
        {
            var teacherId = await _access.CurrentTeacherIdAsync(User);
            query = teacherId == null
                ? query.Where(s => false)
                : query.Where(s => s.Enrollments.Any(e => e.TeacherId == teacherId.Value));
        }

        return await query.Select(s => new {
            s.Id, s.LRN, s.FirstName, s.MiddleName, s.LastName,
            s.Gender, s.BirthDate, s.Address,
            s.ParentGuardianName, s.ParentGuardianContact, s.PreviousSchool,
            s.CreatedAt,
            Enrollments = s.Enrollments.Select(e => new {
                e.Id, e.GradeLevel, e.Section, e.TeacherId,
                SchoolYear = e.SchoolYear.Year,
                Adviser = e.Teacher != null ? e.Teacher.FirstName + " " + e.Teacher.LastName : null
            })
        }).ToListAsync<object>();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Student>> GetStudent(int id)
    {
        var student = await _context.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.SchoolYear)
            .Include(s => s.Enrollments).ThenInclude(e => e.Teacher)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound();
        return student;
    }

    // Teachers add students (enrollment). Admin: view only.
    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<Student>> CreateStudent(Student student)
    {
        if (await _context.Students.AnyAsync(s => s.LRN == student.LRN))
            return BadRequest("LRN already exists");

        student.CreatedAt = DateTime.UtcNow;
        _context.Students.Add(student);
        await _log.RecordAsync(User, "student.created",
            $"registered student {student.FirstName} {student.LastName} (LRN {student.LRN})");
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, student);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> UpdateStudent(int id, [FromBody] Student student)
    {
        var existing = await _context.Students.FindAsync(id);
        if (existing == null) return NotFound();

        if (existing.LRN != student.LRN && await _context.Students.AnyAsync(s => s.LRN == student.LRN && s.Id != id))
            return BadRequest("LRN already exists");

        existing.LRN = student.LRN;
        existing.FirstName = student.FirstName;
        existing.MiddleName = student.MiddleName;
        existing.LastName = student.LastName;
        existing.Suffix = student.Suffix;
        existing.Gender = student.Gender;
        existing.BirthDate = student.BirthDate;
        existing.Address = student.Address;
        existing.ParentGuardianName = student.ParentGuardianName;
        existing.ParentGuardianContact = student.ParentGuardianContact;
        existing.PreviousSchool = student.PreviousSchool;
        existing.UpdatedAt = DateTime.UtcNow;

        await _log.RecordAsync(User, "student.updated",
            $"updated the student record of {existing.FirstName} {existing.LastName}");

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Teachers delete their students. Admin view-only per key takeaways.
    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> DeleteStudent(int id)
    {
        var student = await _context.Students.FindAsync(id);
        if (student == null) return NotFound();
        await _log.RecordAsync(User, "student.deleted",
            $"deleted student {student.FirstName} {student.LastName} (LRN {student.LRN})");
        _context.Students.Remove(student);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}