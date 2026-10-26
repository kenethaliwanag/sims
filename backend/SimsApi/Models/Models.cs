using System.ComponentModel.DataAnnotations;

namespace SimsApi.Models;

public class Teacher
{
    public int Id { get; set; }
    
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? MiddleName { get; set; }
    
    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [Required, MaxLength(10)]
    public string Gender { get; set; } = string.Empty;
    
    [Required]
    public DateTime BirthDate { get; set; }
    
    [Required, MaxLength(500)]
    public string Address { get; set; } = string.Empty;
    
    [Required, MaxLength(100)]
    public string Position { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string MaritalStatus { get; set; } = string.Empty;

    // Departmentalized subjects this teacher handles (for Grade 4-6)
    [MaxLength(200)]
    public string? AssignedSubjects { get; set; } // e.g., "Mathematics,English,Science,MAPEH"

    // Grade level assigned (Kindergarten, SNED, Grade 1-6)
    [MaxLength(50)]
    public string? AssignedGradeLevel { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<TeachingAssignment> TeachingAssignments { get; set; } = new List<TeachingAssignment>();
}

public class Student
{
    public int Id { get; set; }
    
    [Required, MaxLength(20)]
    public string LRN { get; set; } = string.Empty;
    
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? MiddleName { get; set; }
    
    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? Suffix { get; set; }
    
    [Required, MaxLength(10)]
    public string Gender { get; set; } = string.Empty;
    
    [Required]
    public DateTime BirthDate { get; set; }
    
    [Required, MaxLength(500)]
    public string Address { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? ParentGuardianName { get; set; }
    
    [MaxLength(50)]
    public string? ParentGuardianContact { get; set; }
    
    [MaxLength(200)]
    public string? PreviousSchool { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}

public class SchoolYear
{
    public int Id { get; set; }
    
    [Required, MaxLength(20)]
    public string Year { get; set; } = string.Empty;
    
    public bool IsActive { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<TeachingAssignment> TeachingAssignments { get; set; } = new List<TeachingAssignment>();
}

public class Enrollment
{
    public int Id { get; set; }
    
    public int StudentId { get; set; }
    public Student Student { get; set; } = null!;
    
    public int SchoolYearId { get; set; }
    public SchoolYear SchoolYear { get; set; } = null!;
    
    [Required, MaxLength(50)]
    public string GradeLevel { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string Section { get; set; } = string.Empty;

    // Advisory teacher for this enrollment
    public int? TeacherId { get; set; }
    public Teacher? Teacher { get; set; }
    
    public DateTime EnrollmentDate { get; set; } = DateTime.UtcNow;
    
    public ICollection<Grade> Grades { get; set; } = new List<Grade>();
}

public class Subject
{
    public int Id { get; set; }
    
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string GradeLevel { get; set; } = string.Empty;
    
    public ICollection<Grade> Grades { get; set; } = new List<Grade>();
    public ICollection<TeachingAssignment> TeachingAssignments { get; set; } = new List<TeachingAssignment>();
}

public class Grade
{
    public int Id { get; set; }
    
    public int EnrollmentId { get; set; }
    public Enrollment Enrollment { get; set; } = null!;
    
    public int SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
    
    public decimal? FirstQuarter { get; set; }
    public decimal? SecondQuarter { get; set; }
    public decimal? ThirdQuarter { get; set; }
    public decimal? FourthQuarter { get; set; }
    public decimal? FinalRating { get; set; }
    
    [MaxLength(20)]
    public string? Remarks { get; set; }
    
    public DateTime? UpdatedAt { get; set; }
}

// A teacher's official teaching load: one row per subject + section + school year.
public class TeachingAssignment
{
    public int Id { get; set; }

    public int TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;

    // Subjects are seeded per grade level, so the subject carries the grade.
    public int SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Section { get; set; } = string.Empty;

    public int SchoolYearId { get; set; }
    public SchoolYear SchoolYear { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Admin-facing audit trail: who changed which record, written in the same save as the change.
public class ActivityLog
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string ActorName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ActorRole { get; set; } = string.Empty;

    // Machine label, e.g. "enrollment.created" — the UI derives the category badge from it.
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class User
{
    public int Id { get; set; }
    
    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string Role { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? FullName { get; set; }
    
    [MaxLength(50)]
    public string? AssignedGradeLevel { get; set; }
    
    // Link the login to its Teachers row; access rules must never depend on parsing FullName.
    public int? TeacherId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
}