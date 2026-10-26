using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;

namespace SimsApi.Services;

public class FormGeneratorService
{
    private readonly SimsDbContext _context;

    public FormGeneratorService(SimsDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> GenerateSF1Pdf(int schoolYearId, string? gradeLevel)
    {
        var schoolYear = await _context.SchoolYears.FindAsync(schoolYearId);
        if (schoolYear == null) throw new Exception("School year not found");

        var query = _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.SchoolYear)
            .Where(e => e.SchoolYearId == schoolYearId);

        if (!string.IsNullOrEmpty(gradeLevel))
            query = query.Where(e => e.GradeLevel == gradeLevel);

        var enrollments = await query.OrderBy(e => e.GradeLevel).ThenBy(e => e.Section).ThenBy(e => e.Student.LastName).ToListAsync();

        return PdfService.GenerateSF1(enrollments, schoolYear);
    }

    public async Task<byte[]> GenerateSF9Pdf(int studentId, int schoolYearId)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.SchoolYear)
            .Include(e => e.Grades)
            .ThenInclude(g => g.Subject)
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.SchoolYearId == schoolYearId);

        if (enrollment == null) throw new Exception("Enrollment not found");

        return PdfService.GenerateSF9(enrollment);
    }

    public async Task<byte[]> GenerateSF10Pdf(int studentId)
    {
        var student = await _context.Students
            .Include(s => s.Enrollments.OrderBy(e => e.SchoolYear.Year))
            .ThenInclude(e => e.SchoolYear)
            .Include(s => s.Enrollments)
            .ThenInclude(e => e.Grades)
            .ThenInclude(g => g.Subject)
            .FirstOrDefaultAsync(s => s.Id == studentId);

        if (student == null) throw new Exception("Student not found");

        return PdfService.GenerateSF10(student);
    }
}
