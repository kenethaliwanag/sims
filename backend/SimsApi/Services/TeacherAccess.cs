using Microsoft.EntityFrameworkCore;
using SimsApi.Data;
using SimsApi.Models;
using System.Security.Claims;

namespace SimsApi.Services;

// Single source of truth for "what may this teacher see and encode": advisory + official teaching load.
public class TeacherAccess
{
    private readonly SimsDbContext _db;

    public TeacherAccess(SimsDbContext db) => _db = db;

    public async Task<Teacher?> CurrentTeacherAsync(ClaimsPrincipal user)
    {
        var username = user.FindFirstValue(ClaimTypes.Name);
        var account = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (account == null) return null;

        if (account.TeacherId != null)
            return await _db.Teachers.FindAsync(account.TeacherId.Value);

        // Fallback for logins created before TeacherId existed: exact "First Last", never token splitting.
        if (string.IsNullOrWhiteSpace(account.FullName)) return null;
        return await _db.Teachers.FirstOrDefaultAsync(t => t.FirstName + " " + t.LastName == account.FullName);
    }

    public async Task<int?> CurrentTeacherIdAsync(ClaimsPrincipal user) => (await CurrentTeacherAsync(user))?.Id;

    public IQueryable<Enrollment> VisibleEnrollments(IQueryable<Enrollment> query, int teacherId) =>
        query.Where(e => e.TeacherId == teacherId ||
            _db.TeachingAssignments.Any(a => a.TeacherId == teacherId &&
                a.Section == e.Section && a.SchoolYearId == e.SchoolYearId &&
                a.Subject.GradeLevel == e.GradeLevel));

    public bool IsAdviser(Enrollment enrollment, int teacherId) => enrollment.TeacherId == teacherId;

    public async Task<bool> CanViewAsync(Enrollment enrollment, int teacherId) =>
        IsAdviser(enrollment, teacherId) ||
        await _db.TeachingAssignments.AnyAsync(a =>
            a.TeacherId == teacherId && a.Section == enrollment.Section &&
            a.SchoolYearId == enrollment.SchoolYearId && a.Subject.GradeLevel == enrollment.GradeLevel);

    public async Task<bool> CanEncodeAsync(Enrollment enrollment, int subjectId, int teacherId)
    {
        if (IsAdviser(enrollment, teacherId)) return true;

        var subject = await _db.Subjects.FindAsync(subjectId);
        if (subject == null || subject.GradeLevel != enrollment.GradeLevel) return false;

        return await _db.TeachingAssignments.AnyAsync(a =>
            a.TeacherId == teacherId && a.SubjectId == subjectId &&
            a.Section == enrollment.Section && a.SchoolYearId == enrollment.SchoolYearId);
    }

    // All subjects this teacher may write for one enrollment, including subjects already graded.
    public async Task<List<int>> EncodableSubjectIdsAsync(Enrollment enrollment, int teacherId)
    {
        if (IsAdviser(enrollment, teacherId))
        {
            return await _db.Subjects
                .Where(s => s.GradeLevel == enrollment.GradeLevel)
                .Select(s => s.Id)
                .ToListAsync();
        }

        return await _db.TeachingAssignments
            .Where(a => a.TeacherId == teacherId && a.Section == enrollment.Section &&
                        a.SchoolYearId == enrollment.SchoolYearId &&
                        a.Subject.GradeLevel == enrollment.GradeLevel)
            .Select(a => a.SubjectId)
            .Distinct()
            .ToListAsync();
    }

    // Subjects this teacher may encode for one enrollment, excluding subjects already graded.
    public async Task<List<Subject>> AllowedSubjectsAsync(Enrollment enrollment, int teacherId)
    {
        var query = _db.Subjects.Where(s => s.GradeLevel == enrollment.GradeLevel);

        if (!IsAdviser(enrollment, teacherId))
        {
            query = query.Where(s => _db.TeachingAssignments.Any(a =>
                a.TeacherId == teacherId && a.SubjectId == s.Id &&
                a.Section == enrollment.Section && a.SchoolYearId == enrollment.SchoolYearId));
        }

        query = query.Where(s => !_db.Grades.Any(g => g.EnrollmentId == enrollment.Id && g.SubjectId == s.Id));
        return await query.OrderBy(s => s.Name).ToListAsync();
    }
}
