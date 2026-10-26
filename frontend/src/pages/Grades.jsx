import React, { useState, useEffect } from 'react';
import { getEnrollments, getMyClasses, getGradesByEnrollment, updateGrade, createGrade, getMySubjects, deleteGrade } from '../services/api';
import { Search, Edit2, Save } from 'lucide-react';
import './Grades.css';

const emptyNewGrade = { subjectId: '', firstQuarter: '', secondQuarter: '', thirdQuarter: '', fourthQuarter: '' };

const QUARTERS = [
  ['firstQuarter', 'Q1'],
  ['secondQuarter', 'Q2'],
  ['thirdQuarter', 'Q3'],
  ['fourthQuarter', 'Q4'],
];

const GRADE_ORDER = ['Kindergarten', 'SNED', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

function Grades({ user }) {
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [openGrade, setOpenGrade] = useState(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [grades, setGrades] = useState([]);
  const [editingGrade, setEditingGrade] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [permissions, setPermissions] = useState({ isAdviser: false, subjectIds: [] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGrade, setNewGrade] = useState(emptyNewGrade);

  useEffect(() => {
    loadEnrollments();
    if (user.role === 'Teacher') loadClasses();
  }, []);

  const loadEnrollments = async () => {
    try {
      // Grades needs the sections this teacher teaches, not just their advisees.
      const data = await getEnrollments(undefined, 'grading');
      setEnrollments(data);
    } catch (err) {
      alert('Failed to load enrollments');
    }
  };

  const loadClasses = async () => {
    try {
      setClasses(await getMyClasses());
    } catch {
      setClasses([]);
    }
  };

  const loadGrades = async (enrollmentId) => {
    try {
      const data = await getGradesByEnrollment(enrollmentId);
      setGrades(data);
    } catch (err) {
      alert('Failed to load grades');
    }
  };

  const loadPermissions = async (enrollmentId) => {
    try {
      const data = await getMySubjects(enrollmentId);
      setSubjects(data.subjects || []);
      setPermissions({ isAdviser: !!data.isAdviser, subjectIds: data.subjectIds || [] });
    } catch {
      setSubjects([]);
      setPermissions({ isAdviser: false, subjectIds: [] });
    }
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setSelectedEnrollment(null);
    setGrades([]);
    setEditingGrade(null);
    setShowAddForm(false);
    setNewGrade(emptyNewGrade);
  };

  const handleSelectEnrollment = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setEditingGrade(null);
    setShowAddForm(false);
    loadGrades(enrollment.id);
    loadPermissions(enrollment.id);
  };

  const handleEditGrade = (grade) => {
    setEditingGrade({ ...grade });
  };

  const fixedSubjectId = selectedClass?.subjectId || null;
  const teacherSubjects = fixedSubjectId ? subjects.filter(s => s.id === fixedSubjectId) : subjects;
  const visibleGrades = fixedSubjectId ? grades.filter(g => g.subjectId === fixedSubjectId) : grades;

  const handleAddGrade = async () => {
    const subjectId = fixedSubjectId || parseInt(newGrade.subjectId);
    if (!selectedEnrollment || !subjectId) return;
    try {
      await createGrade({
        enrollmentId: selectedEnrollment.id,
        subjectId,
        firstQuarter: newGrade.firstQuarter ? parseFloat(newGrade.firstQuarter) : null,
        secondQuarter: newGrade.secondQuarter ? parseFloat(newGrade.secondQuarter) : null,
        thirdQuarter: newGrade.thirdQuarter ? parseFloat(newGrade.thirdQuarter) : null,
        fourthQuarter: newGrade.fourthQuarter ? parseFloat(newGrade.fourthQuarter) : null,
      });
      loadGrades(selectedEnrollment.id);
      loadPermissions(selectedEnrollment.id);
      setShowAddForm(false);
      setNewGrade(emptyNewGrade);
    } catch (err) {
      alert('Failed to save grade: ' + (err.message || ''));
    }
  };

  const handleSaveGrade = async () => {
    if (!editingGrade) return;
    try {
      await updateGrade(editingGrade.id, {
        id: editingGrade.id,
        firstQuarter: editingGrade.firstQuarter,
        secondQuarter: editingGrade.secondQuarter,
        thirdQuarter: editingGrade.thirdQuarter,
        fourthQuarter: editingGrade.fourthQuarter
      });
      loadGrades(selectedEnrollment.id);
      loadPermissions(selectedEnrollment.id);
      setEditingGrade(null);
    } catch (err) {
      alert('Failed to save grade');
    }
  };

  const handleDeleteGrade = async (grade) => {
    if (!confirm(`Delete grade for ${grade.subject?.name || 'this subject'}?`)) return;
    try {
      await deleteGrade(grade.id);
      loadGrades(selectedEnrollment.id);
      loadPermissions(selectedEnrollment.id);
      setEditingGrade(null);
    } catch (err) {
      alert('Failed to delete grade');
    }
  };

  const matchesSearch = (enrollment) =>
    `${enrollment.student?.firstName} ${enrollment.student?.lastName} ${enrollment.student?.lrn} ${enrollment.section} ${enrollment.gradeLevel}`
      .toLowerCase().includes(searchTerm.toLowerCase());

  const rosterFor = (cls) => enrollments
    .filter(e => e.gradeLevel === cls.gradeLevel && e.section === cls.section)
    .filter(matchesSearch)
    .sort((a, b) => (a.student?.lastName || '').localeCompare(b.student?.lastName || ''));

  const classKey = (cls) =>
    `${cls.isAdviser ? 'advisory' : 'subject'}-${cls.subjectId || 0}-${cls.gradeLevel}-${cls.section}`;

  // Admin view: one collapsible group per grade level, same interaction as the teacher's class list.
  const gradeGroups = [...new Set(enrollments.map(e => e.gradeLevel))]
    .sort((a, b) => {
      const ia = GRADE_ORDER.indexOf(a), ib = GRADE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || (a || '').localeCompare(b || '');
    })
    .map(gradeLevel => ({
      gradeLevel,
      total: enrollments.filter(e => e.gradeLevel === gradeLevel).length,
      students: enrollments
        .filter(e => e.gradeLevel === gradeLevel)
        .filter(matchesSearch)
        .sort((a, b) => (a.student?.lastName || '').localeCompare(b.student?.lastName || ''))
    }));

  const canEdit = user.role === 'Teacher';
  const canWriteGrade = (grade) => permissions.isAdviser || permissions.subjectIds.includes(grade.subjectId);

  return (
    <div className="page-container">
      <h2>Student Grades</h2>

      <div className="grades-layout">
        <div className="enrollments-panel">
          {user.role === 'Teacher' ? (
            <>
              <h3>My Classes</h3>
              <div className="search-bar" style={{ marginBottom: 12 }}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search student in class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {classes.length === 0 && (
                <p className="muted">No advisory or teaching load assigned yet.</p>
              )}
              <div className="class-list">
                {classes.map(cls => {
                  const roster = rosterFor(cls);
                  const isActive = selectedClass && classKey(selectedClass) === classKey(cls);
                  return (
                    <div key={classKey(cls)} className={`class-block ${isActive ? 'active' : ''}`}>
                      <button type="button" className="class-header" onClick={() => handleSelectClass(cls)}>
                        <span className="class-title">
                          {cls.isAdviser ? 'Advisory' : cls.subjectName}
                        </span>
                        <span className="class-sub">
                          {cls.gradeLevel} — {cls.section}
                          {cls.schoolYear ? ` · ${cls.schoolYear}` : ''}
                        </span>
                        <span className="class-count">
                          {roster.length} student{roster.length === 1 ? '' : 's'}
                        </span>
                      </button>

                      {isActive && (
                        <div className="class-roster">
                          {roster.length === 0 && (
                            <p className="muted" style={{ padding: '4px 6px', margin: 0 }}>
                              No students in this section yet.
                            </p>
                          )}
                          {roster.map(enrollment => (
                            <div
                              key={enrollment.id}
                              className={`enrollment-item ${selectedEnrollment?.id === enrollment.id ? 'active' : ''}`}
                              onClick={() => handleSelectEnrollment(enrollment)}
                            >
                              <div className="student-name">
                                {enrollment.student?.lastName}, {enrollment.student?.firstName}
                              </div>
                              <div className="student-details">
                                LRN: {enrollment.student?.lrn}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h3>Students by Grade Level</h3>
              <div className="search-bar">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search student or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="class-list">
                {gradeGroups.length === 0 && (
                  <p className="muted">No students enrolled yet.</p>
                )}
                {gradeGroups.map(group => {
                  const isOpen = openGrade === group.gradeLevel || searchTerm.trim() !== '';
                  return (
                    <div key={group.gradeLevel} className={`class-block ${isOpen ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="class-header"
                        onClick={() => setOpenGrade(openGrade === group.gradeLevel ? null : group.gradeLevel)}
                      >
                        <span className="class-title">{group.gradeLevel}</span>
                        <span className="class-count">
                          {group.total} student{group.total === 1 ? '' : 's'}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="class-roster">
                          {group.students.length === 0 && (
                            <p className="muted" style={{ padding: '4px 6px', margin: 0 }}>
                              No student matches your search.
                            </p>
                          )}
                          {group.students.map(enrollment => (
                            <div
                              key={enrollment.id}
                              className={`enrollment-item ${selectedEnrollment?.id === enrollment.id ? 'active' : ''}`}
                              onClick={() => handleSelectEnrollment(enrollment)}
                            >
                              <div className="student-name">
                                {enrollment.student?.lastName}, {enrollment.student?.firstName}
                              </div>
                              <div className="student-details">
                                LRN: {enrollment.student?.lrn} · {enrollment.section}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="grades-panel">
          {selectedEnrollment ? (
            <>
              <div className="student-header">
                <h3>
                  {selectedEnrollment.student?.firstName} {selectedEnrollment.student?.lastName}
                </h3>
                <p>
                  LRN: {selectedEnrollment.student?.lrn} | {selectedEnrollment.gradeLevel} - {selectedEnrollment.section}
                </p>
                {selectedClass && (
                  <p className="muted">
                    {selectedClass.isAdviser
                      ? 'Advisory class — all subjects'
                      : `${selectedClass.subjectName} · ${selectedClass.gradeLevel} — ${selectedClass.section}`}
                  </p>
                )}
              </div>

              {canEdit && teacherSubjects.length > 0 && (
                <div className="add-grade-bar">
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                  >
                    {showAddForm ? 'Cancel' : `Add Grade${fixedSubjectId ? ` — ${selectedClass.subjectName}` : ''}`}
                  </button>
                  {showAddForm && (
                    <div className="grade-form">
                      {!fixedSubjectId && (
                        <div className="quarter-field">
                          <label htmlFor="new-subject">Subject</label>
                          <select
                            id="new-subject"
                            value={newGrade.subjectId}
                            onChange={e => setNewGrade({ ...newGrade, subjectId: e.target.value })}
                          >
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="quarter-fields">
                        {QUARTERS.map(([key, label]) => (
                          <div className="quarter-field" key={key}>
                            <label htmlFor={`new-${key}`}>{label}</label>
                            <input
                              id={`new-${key}`}
                              className="grade-input"
                              type="number"
                              inputMode="numeric"
                              min="60"
                              max="100"
                              step="1"
                              placeholder="60–100"
                              value={newGrade[key]}
                              onChange={e => setNewGrade({ ...newGrade, [key]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                      <button onClick={handleAddGrade} className="btn-primary" style={{ fontSize: 13, padding: '10px 18px' }}>
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="table-container">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Q1</th>
                      <th>Q2</th>
                      <th>Q3</th>
                      <th>Q4</th>
                      <th>Final</th>
                      <th>Remarks</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGrades.map(grade => (
                      <tr key={grade.id}>
                        <td>{grade.subject?.name}</td>
                        {editingGrade?.id === grade.id ? (
                          <>
                            {QUARTERS.map(([key, label]) => (
                              <td key={key}>
                                <input
                                  className="grade-input"
                                  aria-label={label}
                                  type="number"
                                  inputMode="numeric"
                                  min="60"
                                  max="100"
                                  step="1"
                                  value={editingGrade[key] ?? ''}
                                  onChange={(e) => setEditingGrade({
                                    ...editingGrade,
                                    [key]: e.target.value === '' ? null : parseInt(e.target.value, 10)
                                  })}
                                />
                              </td>
                            ))}
                            <td>{editingGrade.finalRating || '-'}</td>
                            <td>{editingGrade.remarks || '-'}</td>
                            <td className="actions">
                              <button onClick={handleSaveGrade} className="icon-btn save">
                                <Save size={16} />
                              </button>
                              <button onClick={() => setEditingGrade(null)} className="icon-btn cancel">
                                ✕
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{grade.firstQuarter || '-'}</td>
                            <td>{grade.secondQuarter || '-'}</td>
                            <td>{grade.thirdQuarter || '-'}</td>
                            <td>{grade.fourthQuarter || '-'}</td>
                            <td className="final-grade">{grade.finalRating || '-'}</td>
                            <td>
                              <span className={`remarks ${grade.remarks?.toLowerCase()}`}>
                                {grade.remarks || '-'}
                              </span>
                            </td>
                            {canEdit && canWriteGrade(grade) && (
                              <td className="actions">
                                <button onClick={() => handleEditGrade(grade)} className="icon-btn edit" title="Edit">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteGrade(grade)} className="icon-btn cancel" title="Delete">
                                  ✕
                                </button>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                    {visibleGrades.length === 0 && (
                      <tr>
                        <td colSpan={canEdit ? 8 : 7} className="muted" style={{ textAlign: 'center', padding: 16 }}>
                          {fixedSubjectId
                            ? `No ${selectedClass.subjectName} grade yet — use Add Grade.`
                            : 'No grades encoded yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>
                {user.role === 'Teacher'
                  ? 'Select a class, then a student to encode grades'
                  : 'Select a student to view grades'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Grades;
