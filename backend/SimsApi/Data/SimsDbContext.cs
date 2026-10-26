using Microsoft.EntityFrameworkCore;
using SimsApi.Models;

namespace SimsApi.Data;

public class SimsDbContext : DbContext
{
    public SimsDbContext(DbContextOptions<SimsDbContext> options) : base(options) { }

    public DbSet<Teacher> Teachers { get; set; }
    public DbSet<Student> Students { get; set; }
    public DbSet<SchoolYear> SchoolYears { get; set; }
    public DbSet<Enrollment> Enrollments { get; set; }
    public DbSet<Subject> Subjects { get; set; }
    public DbSet<Grade> Grades { get; set; }
    public DbSet<TeachingAssignment> TeachingAssignments { get; set; }
    public DbSet<ActivityLog> ActivityLogs { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Enrollment>()
            .HasIndex(e => new { e.StudentId, e.SchoolYearId })
            .IsUnique();

        modelBuilder.Entity<Student>()
            .HasIndex(s => s.LRN)
            .IsUnique();

        modelBuilder.Entity<Grade>()
            .HasIndex(g => new { g.EnrollmentId, g.SubjectId })
            .IsUnique();

        modelBuilder.Entity<TeachingAssignment>()
            .HasIndex(a => new { a.TeacherId, a.SubjectId, a.Section, a.SchoolYearId })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasOne<Teacher>()
            .WithMany()
            .HasForeignKey(u => u.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
