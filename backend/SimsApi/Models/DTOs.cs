namespace SimsApi.Models;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AssignedGradeLevel { get; set; }
}

public class RefreshRequest
{
    public string RefreshToken { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}

public class EnrollmentStats
{
    public int TotalEnrollees { get; set; }
    public int MaleCount { get; set; }
    public int FemaleCount { get; set; }
    public string SchoolYear { get; set; } = string.Empty;
}

public class SF1Request
{
    public int SchoolYearId { get; set; }
    public string? GradeLevel { get; set; }
}

public class SF9Request
{
    public int StudentId { get; set; }
    public int SchoolYearId { get; set; }
}

public class SF10Request
{
    public int StudentId { get; set; }
}

public class TeacherAccountRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
