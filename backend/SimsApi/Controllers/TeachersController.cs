using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;
using System.Security.Cryptography;
using System.Text;

namespace SimsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeachersController : ControllerBase
{
    private readonly SimsDbContext _context;

    public TeachersController(SimsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetTeachers()
    {
        var accounts = await _context.Users.Where(u => u.Role == "Teacher").ToListAsync();
        var teachers = await _context.Teachers.OrderBy(t => t.LastName).ToListAsync();

        // Advisory class = the enrolment(s) where this teacher is the adviser.
        var advisories = await _context.Enrollments
            .Where(e => e.TeacherId != null)
            .Select(e => new { TeacherId = e.TeacherId!.Value, e.GradeLevel, e.Section })
            .Distinct()
            .ToListAsync();

        return teachers.Select(t =>
        {
            var account = accounts.FirstOrDefault(u => u.TeacherId == t.Id);
            return (object)new
            {
                t.Id, t.FirstName, t.MiddleName, t.LastName, t.Gender, t.BirthDate,
                t.Address, t.Position, t.MaritalStatus, t.AssignedSubjects, t.AssignedGradeLevel,
                t.CreatedAt, t.UpdatedAt,
                AdvisoryClass = string.Join(", ", advisories
                    .Where(a => a.TeacherId == t.Id)
                    .OrderBy(a => a.GradeLevel)
                    .Select(a => $"{a.GradeLevel} — {a.Section}")),
                HasAccount = account != null,
                Username = account?.Username
            };
        }).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Teacher>> GetTeacher(int id)
    {
        var teacher = await _context.Teachers.FindAsync(id);
        if (teacher == null) return NotFound();
        return teacher;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Teacher>> CreateTeacher(Teacher teacher)
    {
        teacher.CreatedAt = DateTime.UtcNow;
        _context.Teachers.Add(teacher);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTeacher), new { id = teacher.Id }, teacher);
    }

    [HttpPost("{id}/account")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateTeacherAccount(int id, [FromBody] TeacherAccountRequest request)
    {
        var teacher = await _context.Teachers.FindAsync(id);
        if (teacher == null) return NotFound("Teacher not found");

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Username and password are required");

        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            return BadRequest("Username already exists");

        if (await _context.Users.AnyAsync(u => u.TeacherId == id))
            return BadRequest("This teacher already has a login account");

        var fullName = $"{teacher.FirstName} {teacher.LastName}";
        _context.Users.Add(new User
        {
            Username = request.Username,
            PasswordHash = HashPassword(request.Password),
            Role = "Teacher",
            FullName = fullName,
            AssignedGradeLevel = teacher.AssignedGradeLevel,
            TeacherId = teacher.Id
        });
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTeacher(int id, Teacher teacher)
    {
        if (id != teacher.Id) return BadRequest();

        teacher.UpdatedAt = DateTime.UtcNow;
        _context.Entry(teacher).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Teachers.AnyAsync(t => t.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTeacher(int id)
    {
        var teacher = await _context.Teachers.FindAsync(id);
        if (teacher == null) return NotFound();

        // The login belongs to the teacher: removing the teacher must remove their access too.
        var accounts = await _context.Users.Where(u => u.TeacherId == id).ToListAsync();
        _context.Users.RemoveRange(accounts);

        _context.Teachers.Remove(teacher);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }
}
