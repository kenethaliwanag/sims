import React, { useState, useEffect } from "react";
import { getStudents } from "../services/api";
import { Search, Eye } from "lucide-react";
import "./Students.css";

const GRADE_LEVELS = [
  "Kindergarten",
  "SNED",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

function Students({ user }) {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [viewStudent, setViewStudent] = useState(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      alert("Failed to load students");
    }
  };

  const filteredStudents = students.filter((s) => {
    if (gradeFilter && gradeFilter !== "All Grade Levels") {
      const grade = s.enrollments?.[0]?.gradeLevel || "";
      if (grade !== gradeFilter) return false;
    }
    return (
      (s.firstName + " " + s.lastName)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) || s.lrn?.includes(searchTerm)
    );
  });

  const studentStatus = (student) => {
    if (!student.enrollments || !student.enrollments.length)
      return "Not Enrolled";
    return "Enrolled";
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Students Management</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.role === "Teacher" && (
            <span style={{ color: "#6b7280", fontSize: 13 }}>
              Adviser View: Enrollments managed in Enrollments tab
            </span>
          )}
          {user.role === "Admin" && (
            <span style={{ color: "#6b7280", fontSize: 13 }}>Administrative View</span>
          )}
        </div>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by name or LRN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {user?.role === "Admin" && (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Filter by grade level"
          >
            <option value="">All Grade Levels</option>
            {GRADE_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>LRN</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Birth Date</th>
              <th>Grade Level</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>{student.lrn}</td>
                <td>
                  {student.lastName}, {student.firstName} {student.middleName}
                </td>
                <td>{student.gender}</td>
                <td>{new Date(student.birthDate).toLocaleDateString()}</td>
                <td>
                  {student.enrollments?.[0]?.gradeLevel || "Not Enrolled"}
                </td>
                <td className="actions">
                  <button
                    onClick={() => setViewStudent(student)}
                    className="icon-btn"
                    title="View Profile"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewStudent && (
        <div className="modal-overlay" onClick={() => setViewStudent(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Student Profile</h3>
              <button onClick={() => setViewStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div className="view-details">
              <div className="detail-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <label>Full Name</label>
                <p style={{ fontSize: '1.25rem', fontWeight: '700' }}>{viewStudent.lastName}, {viewStudent.firstName} {viewStudent.middleName || ""}</p>
              </div>
              <div className="detail-group">
                <label>LRN</label>
                <p>{viewStudent.lrn}</p>
              </div>
              <div className="detail-group">
                <label>Gender</label>
                <p>{viewStudent.gender}</p>
              </div>
              <div className="detail-group">
                <label>Birth Date</label>
                <p>{new Date(viewStudent.birthDate).toLocaleDateString()}</p>
              </div>
              <div className="detail-group">
                <label>Status</label>
                <p>{studentStatus(viewStudent)}</p>
              </div>
              <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <p>{viewStudent.address}</p>
              </div>
              <div className="detail-group">
                <label>Parent/Guardian</label>
                <p>{viewStudent.parentGuardianName || "N/A"}</p>
              </div>
              <div className="detail-group">
                <label>Contact</label>
                <p>{viewStudent.parentGuardianContact || "N/A"}</p>
              </div>
              <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                <label>Previous School</label>
                <p>{viewStudent.previousSchool || "N/A"}</p>
              </div>
              <div className="detail-group" style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <label>Enrollment Grade Level</label>
                <p style={{ fontWeight: '600' }}>{viewStudent.enrollments?.[0]?.gradeLevel || "Not Enrolled"}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;
