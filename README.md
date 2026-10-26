# SIMS - School Information Management System

## DepEd-Compliant School Management System for the Philippines

A complete full-stack application for managing school operations with official DepEd forms support (SF1, SF9, SF10).

---

## 🎯 Project Overview

**Target**: Single public elementary/secondary school pilot under DepEd Philippines
**Compliance**: Data Privacy Act of 2012, DepEd standards
**Tech Stack**: 
- **Frontend**: React 18 Progressive Web App (PWA) with offline support
- **Backend**: ASP.NET Core (.NET 8) Web API
- **Database**: SQL Server / PostgreSQL
- **PDF Generation**: QuestPDF

---

## ✨ Features

### Core Modules

#### 1. Teacher Information Management
- Full CRUD operations
- Fields: Name, Gender, Birth Date, Address, Position, Marital Status
- Role: Admin only

#### 2. Student Information Management
- Full CRUD operations with LRN (Learner Reference Number)
- Fields: LRN, Name, Gender, Birth Date, Address, Parent/Guardian info
- Role: Admin, Registrar

#### 3. Enrollment Management
- Track students by school year, grade level, and section
- Automatic enrollment statistics
- Real-time breakdown by gender
- Role: Admin, Registrar

#### 4. Grades Management
- Quarterly grades entry (Q1-Q4)
- Automatic final rating calculation
- PASSED/FAILED remarks (75% passing grade)
- Role: Admin, Teacher

#### 5. DepEd Forms Generator
**SF1 - School Register**
- Master list of all enrolled learners
- Filter by grade level or generate for all
- Auto-populated from enrollment data

**SF9 - Learner's Progress Report Card** (replaces Form 138)
- Individual student quarterly grades
- Shows all subjects with final ratings

**SF10 - Learner's Permanent Academic Record** (replaces Form 137)
- Complete academic history per student
- Multi-year scholastic record

### Role-Based Access Control

| Feature | Admin | Registrar | Teacher |
|---------|-------|-----------|---------|
| Dashboard | ✓ | ✓ | ✓ |
| Teachers CRUD | ✓ | - | - |
| Students CRUD | ✓ | ✓ | View only |
| Enrollments | ✓ | ✓ | View only |
| Grades Entry | ✓ | - | ✓ |
| DepEd Forms | ✓ | ✓ | ✓ |

---

## 🚀 Quick Start

### Prerequisites
- **Backend**: .NET 8 SDK, SQL Server (or PostgreSQL)
- **Frontend**: Node.js 18+, npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd sims-deped/backend/SimsApi

# Restore packages
dotnet restore

# Update connection string in appsettings.json if needed
# Default: Server=localhost;Database=SimsDb;Trusted_Connection=True;TrustServerCertificate=True

# Run migrations (database will be created automatically)
dotnet ef database update

# Run the API (will seed initial data)
dotnet run
```

API will start at `https://localhost:5000` with Swagger UI at `https://localhost:5000/swagger`

### Frontend Setup

```bash
# Navigate to frontend
cd sims-deped/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

App will start at `http://localhost:3000`

---

## 👥 Default Users

| Role | Username | Password |
|------|----------|----------|
| **Admin** | admin | admin123 |
| **Registrar** | registrar | reg123 |
| **Teacher** | teacher | teacher123 |

---

## 📁 Project Structure

```
sims-deped/
├── backend/
│   └── SimsApi/
│       ├── Controllers/          # API endpoints
│       │   ├── AuthController.cs
│       │   ├── TeachersController.cs
│       │   ├── StudentsController.cs
│       │   ├── EnrollmentsController.cs
│       │   ├── GradesController.cs
│       │   └── FormsController.cs
│       ├── Models/               # Entity models
│       │   ├── Models.cs         # Core entities
│       │   └── DTOs.cs           # Request/response DTOs
│       ├── Data/
│       │   └── SimsDbContext.cs  # EF Core context
│       ├── Services/
│       │   ├── FormGeneratorService.cs
│       │   └── PdfService.cs     # QuestPDF generation
│       ├── Program.cs            # App configuration
│       ├── appsettings.json
│       └── SimsApi.csproj
│
└── frontend/
    ├── src/
    │   ├── components/           # Reusable UI
    │   │   ├── Sidebar.jsx
    │   │   └── Header.jsx
    │   ├── pages/                # Main pages
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Teachers.jsx
    │   │   ├── Students.jsx
    │   │   ├── Enrollments.jsx
    │   │   ├── Grades.jsx
    │   │   └── Forms.jsx         # SF1/SF9/SF10 generator
    │   ├── services/
    │   │   └── api.js            # API client
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js            # PWA configuration
    └── package.json
```

---

## 🗄️ Database Schema

**Teachers**: Core teacher information
**Students**: Student records with LRN
**SchoolYears**: Academic years (e.g., 2026-2027)
**Enrollments**: Student-SchoolYear-GradeLevel-Section mapping
**Subjects**: Pre-populated subjects per grade level
**Grades**: Quarterly grades (Q1-Q4, Final, Remarks)
**Users**: Authentication and role management

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Teachers
- `GET /api/teachers` - List all
- `GET /api/teachers/{id}` - Get by ID
- `POST /api/teachers` - Create (Admin)
- `PUT /api/teachers/{id}` - Update (Admin)
- `DELETE /api/teachers/{id}` - Delete (Admin)

### Students
- `GET /api/students` - List all
- `GET /api/students/{id}` - Get by ID
- `POST /api/students` - Create (Admin, Registrar)
- `PUT /api/students/{id}` - Update (Admin, Registrar)
- `DELETE /api/students/{id}` - Delete (Admin)

### Enrollments
- `GET /api/enrollments?schoolYearId={id}` - List enrollments
- `GET /api/enrollments/stats?schoolYearId={id}` - Get statistics
- `POST /api/enrollments` - Create enrollment (Admin, Registrar)
- `DELETE /api/enrollments/{id}` - Delete (Admin, Registrar)

### Grades
- `GET /api/grades/enrollment/{id}` - Get grades by enrollment
- `POST /api/grades` - Create grade (Admin, Teacher)
- `PUT /api/grades/{id}` - Update grade (Admin, Teacher)
- `DELETE /api/grades/{id}` - Delete (Admin)

### Forms (PDF Generation)
- `POST /api/forms/sf1` - Generate SF1 (School Register)
- `POST /api/forms/sf9` - Generate SF9 (Progress Card)
- `POST /api/forms/sf10` - Generate SF10 (Permanent Record)

---

## 🔒 Security & Compliance

### Authentication
- JWT Bearer tokens (8-hour expiration)
- Role-based authorization
- Secure password hashing (SHA256 - **shortcut: upgrade to BCrypt in production**)

### Data Privacy Act Compliance
- User authentication required for all operations
- Role-based access control
- Audit trail via CreatedAt/UpdatedAt timestamps
- **Note**: For full compliance, implement audit logging and data retention policies

### Security Considerations
- HTTPS required in production
- CORS configured for frontend origin
- SQL injection protection via EF Core parameterized queries
- Input validation on all endpoints

---

## 📱 PWA Features

- **Offline Capable**: Service worker caches API responses
- **Installable**: Can be installed as native app on mobile/desktop
- **Network-First Strategy**: Always tries fresh data, falls back to cache
- **Auto-Update**: Service worker updates automatically

---

## 🎨 UI/UX Features

- Clean, intuitive interface for non-technical users
- Search and filter on all data tables
- Modal-based forms for quick data entry
- Responsive design (mobile, tablet, desktop)
- Real-time enrollment statistics
- One-click PDF generation and download

---

## 🚀 Production Deployment

### Backend (.NET API)

```bash
# Publish the API
dotnet publish -c Release -o ./publish

# Update appsettings.json for production:
# - Change connection string to production database
# - Update JWT:Key to a strong secret key
# - Set appropriate CORS origins

# Deploy to IIS, Azure App Service, or Docker
```

### Frontend (React PWA)

```bash
# Build for production
npm run build

# Deploy dist/ folder to:
# - Netlify, Vercel, Azure Static Web Apps
# - Or serve with nginx/Apache
```

### Environment Variables

**Backend** (appsettings.Production.json):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "YOUR_PRODUCTION_DB_CONNECTION_STRING"
  },
  "Jwt": {
    "Key": "YOUR_STRONG_SECRET_KEY_HERE",
    "Issuer": "SimsApi",
    "Audience": "SimsClient"
  }
}
```

**Frontend** (vite.config.js):
```javascript
// Update API proxy target to production API URL
proxy: {
  '/api': {
    target: 'https://your-api-domain.com',
    changeOrigin: true,
    secure: true
  }
}
```

---

## 📊 Testing

### Test Data Seeding

The system automatically seeds:
- 3 users (admin, registrar, teacher)
- 2 school years (2025-2026, 2026-2027)
- 13 subjects × 12 grade levels = 156 subjects

### Manual Testing Flow

1. **Login** as admin
2. **Add Teachers** (Teachers page)
3. **Add Students** with LRN (Students page)
4. **Enroll Students** for current school year (Enrollments page)
5. **Enter Grades** quarterly (Grades page)
6. **Generate Forms** (Forms page)
   - SF1 for whole school or by grade
   - SF9 for individual students
   - SF10 for student history

---

## 🔧 Known Limitations & Shortcuts

### Shortcuts (for pilot/demo)
1. **Password Hashing**: Uses SHA256 instead of BCrypt
   - *Upgrade path*: Replace with `BCrypt.Net` in production
2. **Active School Year**: Hardcoded to ID=2 in some frontend calls
   - *Upgrade path*: Fetch from `/api/schoolyears/active` endpoint
3. **Final Grade Calculation**: Simple average of 4 quarters
   - *Upgrade path*: Implement DepEd-specific weighted grading formula if needed
4. **Audit Logging**: Basic timestamps only
   - *Upgrade path*: Add comprehensive audit log table for compliance

### Missing Features (for full production)
- Email notifications
- Bulk import/export (CSV, Excel)
- Advanced reporting (charts, analytics)
- Parent portal access
- Attendance tracking
- Document uploads (photos, certificates)
- Multi-school support

---

## 📞 Support & Maintenance

### Common Issues

**Database Connection Failed**
- Verify SQL Server is running
- Check connection string in appsettings.json
- Ensure database user has proper permissions

**API CORS Errors**
- Add frontend URL to CORS policy in Program.cs
- Ensure API is running on expected port

**PDF Generation Fails**
- Verify QuestPDF.License is set to Community
- Check that enrollment/grades data exists

**PWA Not Installing**
- Ensure HTTPS in production
- Check manifest.json is served correctly
- Verify service worker registration

---

## 📜 License

This project is provided as-is for educational and pilot purposes. For production deployment in Philippine public schools, ensure compliance with:
- DepEd memorandums and guidelines
- Data Privacy Act of 2012 (RA 10173)
- Relevant local regulations

---

## 🎓 DepEd Forms Reference

- **SF1**: DepEd Order No. 10, s. 2015
- **SF9**: K to 12 Grading System (DepEd Order No. 8, s. 2015)
- **SF10**: Learner Permanent Record format

---

## 🛠️ Development Commands

### Backend
```bash
dotnet restore              # Restore packages
dotnet build                # Build project
dotnet run                  # Run API
dotnet ef migrations add    # Add migration
dotnet ef database update   # Apply migrations
```

### Frontend
```bash
npm install                 # Install dependencies
npm run dev                 # Development server
npm run build               # Production build
npm run preview             # Preview production build
```

---

## ✅ System Requirements

### Minimum
- **Backend**: 2 vCPU, 4GB RAM, 10GB storage
- **Database**: SQL Server 2019+ or PostgreSQL 13+
- **Frontend**: Any modern browser (Chrome, Firefox, Safari, Edge)

### Recommended
- **Backend**: 4 vCPU, 8GB RAM, 50GB storage
- **Database**: Dedicated server with backup strategy
- **Network**: HTTPS with valid SSL certificate

---

**Built with ❤️ for Philippine Public Schools**

For questions or support: [Your Contact Information]

Last Updated: October 25, 2026
