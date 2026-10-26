using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SimsApi.Data;
using SimsApi.Models;
using SimsApi.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<SimsDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Data Source=sims.db"));

// Services
builder.Services.AddScoped<FormGeneratorService>();
builder.Services.AddScoped<TeacherAccess>();
builder.Services.AddScoped<ActivityLogger>();

// Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "YourSecretKeyHere123456789012345678901234567890";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SimsApi";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "SimsClient",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// Authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdminRole", policy => policy.RequireRole("Admin"));
    options.AddPolicy("RequireRegistrarRole", policy => policy.RequireRole("Admin", "Registrar"));
    options.AddPolicy("RequireTeacherRole", policy => policy.RequireRole("Admin", "Teacher"));
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowPWA", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SIMS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// Seed database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SimsDbContext>();
    await SeedDatabase(context);
}

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowPWA");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static async Task SeedDatabase(SimsDbContext context)
{
    context.Database.EnsureCreated();

    // EnsureCreated does not alter an existing database; keep the teaching-load table in sync without migrations.
    await context.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "TeachingAssignments" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_TeachingAssignments" PRIMARY KEY AUTOINCREMENT,
            "TeacherId" INTEGER NOT NULL,
            "SubjectId" INTEGER NOT NULL,
            "Section" TEXT NOT NULL,
            "SchoolYearId" INTEGER NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_TeachingAssignments_Teachers_TeacherId" FOREIGN KEY ("TeacherId") REFERENCES "Teachers" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_TeachingAssignments_Subjects_SubjectId" FOREIGN KEY ("SubjectId") REFERENCES "Subjects" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_TeachingAssignments_SchoolYears_SchoolYearId" FOREIGN KEY ("SchoolYearId") REFERENCES "SchoolYears" ("Id") ON DELETE CASCADE
        );
        """);
    await context.Database.ExecuteSqlRawAsync("""
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_TeachingAssignments_TeacherId_SubjectId_Section_SchoolYearId"
        ON "TeachingAssignments" ("TeacherId", "SubjectId", "Section", "SchoolYearId");
        """);

    // Existing databases also predate the activity audit table.
    await context.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "ActivityLogs" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_ActivityLogs" PRIMARY KEY AUTOINCREMENT,
            "ActorName" TEXT NOT NULL,
            "ActorRole" TEXT NOT NULL,
            "Action" TEXT NOT NULL,
            "Description" TEXT NOT NULL,
            "CreatedAt" TEXT NOT NULL
        );
        """);
    await context.Database.ExecuteSqlRawAsync("""
        CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_CreatedAt" ON "ActivityLogs" ("CreatedAt");
        """);

    // Seed users if empty
    if (!context.Users.Any())
    {
        context.Users.AddRange(
            new User { Username = "admin", PasswordHash = HashPassword("admin123"), Role = "Admin", FullName = "School Head" },
            new User { Username = "teacher1", PasswordHash = HashPassword("teacher123"), Role = "Teacher", FullName = "Juan Dela Cruz", AssignedGradeLevel = "Grade 1" },
            new User { Username = "teacher2", PasswordHash = HashPassword("teacher123"), Role = "Teacher", FullName = "Maria Santos", AssignedGradeLevel = "Grade 2" },
            new User { Username = "kinder", PasswordHash = HashPassword("teacher123"), Role = "Teacher", FullName = "Ana Reyes", AssignedGradeLevel = "Kindergarten" }
        );
    }

    // Ensure RefreshToken columns exist (added for session timeout)
    await context.Database.ExecuteSqlRawAsync("""
        ALTER TABLE "Users" ADD COLUMN "RefreshToken" TEXT;
        """);
    await context.Database.ExecuteSqlRawAsync("""
        ALTER TABLE "Users" ADD COLUMN "RefreshTokenExpiryTime" TEXT;
        """);

    if (!context.Teachers.Any())

    {
        context.Teachers.AddRange(
            new Teacher { FirstName = "Juan", LastName = "Dela Cruz", Gender = "Male", BirthDate = new DateTime(1985, 5, 10), Address = "Test", Position = "Teacher I", MaritalStatus = "Single", AssignedGradeLevel = "Grade 1", AssignedSubjects = "Filipino,Mathematics" },
            new Teacher { FirstName = "Maria", LastName = "Santos", Gender = "Female", BirthDate = new DateTime(1988, 3, 15), Address = "Test", Position = "Teacher I", MaritalStatus = "Single", AssignedGradeLevel = "Grade 2", AssignedSubjects = "English,Science" },
            new Teacher { FirstName = "Ana", LastName = "Reyes", Gender = "Female", BirthDate = new DateTime(1990, 7, 20), Address = "Test", Position = "Teacher I", MaritalStatus = "Single", AssignedGradeLevel = "Kindergarten", AssignedSubjects = "Mother Tongue" }
        );
    }

    // Seed school years if empty
    if (!context.SchoolYears.Any())
    {
        context.SchoolYears.AddRange(
            new SchoolYear { Year = "2025-2026", IsActive = false },
            new SchoolYear { Year = "2026-2027", IsActive = true }
        );
    }

    // Seed subjects per grade level
    if (!context.Subjects.Any())
    {
        var gradeLevels = new[]
        {
            "Kindergarten",
            "SNED",
            "Grade 1", "Grade 2", "Grade 3",
            "Grade 4", "Grade 5", "Grade 6"
        };

        var subjectsByLevel = new Dictionary<string, string[]>
        {
            ["Kindergarten"] = new[] { "Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Music", "Arts", "Physical Education", "Health" },
            ["SNED"] = new[] { "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health" },
            ["Grade 1"] = new[] { "Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health" },
            ["Grade 2"] = new[] { "Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health" },
            ["Grade 3"] = new[] { "Mother Tongue", "Filipino", "English", "Mathematics", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health" },
            ["Grade 4"] = new[] { "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health", "Edukasyong Pantahanan at Pangkabuhayan" },
            ["Grade 5"] = new[] { "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health", "Edukasyong Pantahanan at Pangkabuhayan" },
            ["Grade 6"] = new[] { "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan", "Edukasyon sa Pagpapakatao", "Music", "Arts", "Physical Education", "Health", "Edukasyong Pantahanan at Pangkabuhayan" },
        };

        foreach (var level in gradeLevels)
        {
            foreach (var subject in subjectsByLevel[level])
            {
                context.Subjects.Add(new Subject
                {
                    Name = subject,
                    Code = $"{subject.Substring(0, 3).ToUpper()}-{level.Replace(" ", "")}",
                    GradeLevel = level
                });
            }
        }
    }

    await context.SaveChangesAsync();

    // Existing databases: add the login→teacher link once, then backfill it from the full name.
    var hasTeacherId = await context.Database
        .SqlQueryRaw<int>("SELECT COUNT(*) AS \"Value\" FROM pragma_table_info('Users') WHERE name = 'TeacherId'")
        .SingleAsync() > 0;
    if (!hasTeacherId)
        await context.Database.ExecuteSqlRawAsync(
            "ALTER TABLE \"Users\" ADD COLUMN \"TeacherId\" INTEGER NULL REFERENCES \"Teachers\" (\"Id\") ON DELETE SET NULL;");

    await context.Database.ExecuteSqlRawAsync("""
        UPDATE "Users" SET "TeacherId" = (
            SELECT MIN(t."Id") FROM "Teachers" t
            WHERE t."FirstName" || ' ' || t."LastName" = "Users"."FullName"
        )
        WHERE "Users"."Role" = 'Teacher' AND "Users"."TeacherId" IS NULL
          AND EXISTS (SELECT 1 FROM "Teachers" t
                      WHERE t."FirstName" || ' ' || t."LastName" = "Users"."FullName");
        """);
}

static string HashPassword(string password)
{
    using var sha256 = System.Security.Cryptography.SHA256.Create();
    var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
    return Convert.ToBase64String(bytes);
}
