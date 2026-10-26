import React, { useState, useEffect } from 'react';
import { getAssignments, createAssignment, deleteAssignment, getTeachers, getSubjects, getEnrollments } from '../services/api';
import { Search, Plus, Trash2 } from 'lucide-react';

const GRADE_ORDER = ['Kindergarten', 'SNED', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

function TeachingLoad({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sectionsByGrade, setSectionsByGrade] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ teacherId: '', subjectId: '', section: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [assignmentData, teacherData, subjectData, enrollmentData] = await Promise.all([
        getAssignments(), getTeachers(), getSubjects(), getEnrollments()
      ]);
      setAssignments(assignmentData);
      setTeachers(teacherData);
      setSubjects(subjectData);

      // Existing sections per grade, used to avoid typos: permissions compare section strings exactly.
      const byGrade = {};
      enrollmentData.forEach(e => {
        byGrade[e.gradeLevel] = byGrade[e.gradeLevel] || new Set();
        byGrade[e.gradeLevel].add(e.section);
      });
      Object.keys(byGrade).forEach(g => { byGrade[g] = [...byGrade[g]].sort(); });
      setSectionsByGrade(byGrade);
    } catch {
      alert('Failed to load teaching load');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAssignment({
        teacherId: Number(form.teacherId),
        subjectId: Number(form.subjectId),
        section: form.section.trim()
      });
      setShowModal(false);
      setForm({ teacherId: '', subjectId: '', section: '' });
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to save teaching load');
    }
  };

  const handleDelete = async (assignment) => {
    if (!confirm(`Remove ${assignment.subjectName} (${assignment.gradeLevel} - ${assignment.section}) from ${assignment.teacherName}?`)) return;
    try {
      await deleteAssignment(assignment.id);
      loadAll();
    } catch {
      alert('Failed to delete teaching load');
    }
  };

  if (user.role !== 'Admin') {
    return <div className="page-container"><p>Admins only.</p></div>;
  }

  const filtered = assignments.filter(a => {
    const term = searchTerm.toLowerCase();
    return (a.teacherName || '').toLowerCase().includes(term)
      || (a.subjectName || '').toLowerCase().includes(term)
      || (a.section || '').toLowerCase().includes(term)
      || (a.gradeLevel || '').toLowerCase().includes(term);
  });

  const selectedGrade = subjects.find(s => s.id === Number(form.subjectId))?.gradeLevel;
  const sectionOptions = sectionsByGrade[selectedGrade] || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Teaching Load</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Assign Subject
        </button>
      </div>

      <p style={{ fontSize: 13, color: '#6b7280', marginTop: -8 }}>
        A teacher can encode grades only for the subject and section assigned here. Advisers keep full access to their own advisees.
      </p>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by teacher, subject, grade, or section..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Grade Level</th>
              <th>Subject</th>
              <th>Section</th>
              <th>School Year</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(assignment => (
              <tr key={assignment.id}>
                <td>{assignment.teacherName}</td>
                <td>{assignment.gradeLevel}</td>
                <td>{assignment.subjectName}</td>
                <td>{assignment.section}</td>
                <td>{assignment.schoolYear}</td>
                <td className="actions">
                  <button onClick={() => handleDelete(assignment)} className="icon-btn delete" title="Remove">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>No teaching load assigned yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Subject to Teacher</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Teacher *</label>
                <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} required>
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject (grade is part of the subject) *</label>
                <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} required>
                  <option value="">Select Subject</option>
                  {GRADE_ORDER.map(grade => {
                    const options = subjects.filter(s => s.gradeLevel === grade);
                    if (!options.length) return null;
                    return (
                      <optgroup key={grade} label={grade}>
                        {options.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Section *</label>
                <input
                  value={form.section}
                  onChange={e => setForm({ ...form, section: e.target.value })}
                  list="teaching-load-sections"
                  placeholder="e.g., Rizal"
                  required
                />
                <datalist id="teaching-load-sections">
                  {sectionOptions.map(section => <option key={section} value={section} />)}
                </datalist>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeachingLoad;
