import React, { useState, useEffect } from 'react';
import { getEnrollments, getStudents, getStudent, createStudent, createEnrollment, updateEnrollment, deleteEnrollment, deleteStudent, updateStudent } from '../services/api';
import { Search, Plus, Users, Edit2, Trash2 } from 'lucide-react';
import './Enrollments.css';

const GRADE_LEVELS = ['Kindergarten', 'SNED', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

function Enrollments({ user }) {
  const [enrollments, setEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const defaultGradeLevel = user?.assignedGradeLevel || 'Grade 1';
  const [formData, setFormData] = useState({
    lrn: '', firstName: '', middleName: '', lastName: '', suffix: '', gender: 'Male',
    birthDate: '', address: '', parentGuardianName: '', parentGuardianContact: '', previousSchool: 'N/A',
    gradeLevel: defaultGradeLevel, section: '', schoolYearId: 2
  });

  useEffect(() => { loadEnrollments(); }, []);

  const loadEnrollments = async () => {
    try {
      const data = await getEnrollments();
      setEnrollments(data);
    } catch (err) { alert('Failed to load enrollments'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editEnrollment) {
        await updateEnrollment(editEnrollment.id, {
          gradeLevel: formData.gradeLevel,
          section: formData.section
        });
        const sid = editEnrollment.studentId || editEnrollment.StudentId || editEnrollment.id;
        await updateStudent(sid, {
          lrn: formData.lrn,
          firstName: formData.firstName,
          middleName: formData.middleName || null,
          lastName: formData.lastName,
          suffix: formData.suffix || null,
          gender: formData.gender,
          birthDate: formData.birthDate,
          address: formData.address,
          parentGuardianName: formData.parentGuardianName || null,
          parentGuardianContact: formData.parentGuardianContact || null,
          previousSchool: formData.previousSchool || 'N/A'
        });
        loadEnrollments();
        closeModal();
        setEditEnrollment(null);
        return;
      }
      const studentData = {
        lrn: formData.lrn,
        firstName: formData.firstName,
        middleName: formData.middleName || null,
        lastName: formData.lastName,
        suffix: formData.suffix || null,
        gender: formData.gender,
        birthDate: formData.birthDate,
        address: formData.address,
        parentGuardianName: formData.parentGuardianName || null,
        parentGuardianContact: formData.parentGuardianContact || null,
        previousSchool: formData.previousSchool || 'N/A'
      };
      const studentRes = await createStudent(studentData);
      const studentId = studentRes.id || studentRes.Id;

      await createEnrollment({
        studentId: parseInt(studentId),
        schoolYearId: parseInt(formData.schoolYearId),
        gradeLevel: formData.gradeLevel,
        section: formData.section
      });

      loadEnrollments();
      closeModal();
    } catch (err) { alert(err.message || 'Failed to enroll student'); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditEnrollment(null);
    setFormData({
      lrn: '', firstName: '', middleName: '', lastName: '', suffix: '', gender: 'Male',
      birthDate: '', address: '', parentGuardianName: '', parentGuardianContact: '', previousSchool: 'N/A',
      gradeLevel: defaultGradeLevel, section: '', schoolYearId: 2
    });
  };

  const [editEnrollment, setEditEnrollment] = useState(null);

  const handleEdit = async (enrollment) => {
    setEditEnrollment(enrollment);
    try {
      // Use the most reliable ID for the student
      const sid = enrollment.studentId || enrollment.StudentId || enrollment.student?.id;
      
      if (!sid) {
        throw new Error("No valid student ID found for this enrollment");
      }

      const student = await getStudent(sid);
      
      setFormData({
        lrn: student.lrn || enrollment.lrn || '',
        firstName: student.firstName || '',
        middleName: student.middleName || '',
        lastName: student.lastName || '',
        suffix: student.suffix || '',
        gender: student.gender || 'Male',
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
        address: student.address || '',
        parentGuardianName: student.parentGuardianName || '',
        parentGuardianContact: student.parentGuardianContact || '',
        previousSchool: student.previousSchool || 'N/A',
        gradeLevel: enrollment.gradeLevel || 'Grade 1',
        section: enrollment.section || '',
        schoolYearId: 2
      });
    } catch (err) {
      console.error("Error fetching student details:", err);
      // Fallback to data already present in the enrollment object
      setFormData({
        lrn: enrollment.lrn || '', 
        firstName: enrollment.student?.firstName || '', 
        middleName: enrollment.student?.middleName || '', 
        lastName: enrollment.student?.lastName || '',
        suffix: enrollment.student?.suffix || '', 
        gender: enrollment.student?.gender || 'Male', 
        birthDate: enrollment.student?.birthDate ? enrollment.student.birthDate.split('T')[0] : '', 
        address: enrollment.student?.address || '', 
        parentGuardianName: enrollment.student?.parentGuardianName || '', 
        parentGuardianContact: enrollment.student?.parentGuardianContact || '', 
        previousSchool: enrollment.student?.previousSchool || 'N/A',
        gradeLevel: enrollment.gradeLevel || 'Grade 1', 
        section: enrollment.section || '', 
        schoolYearId: 2
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id, studentId) => {
    if (!window.confirm('Delete this enrollment and student?')) return;
    try {
      await deleteEnrollment(id);
      if (studentId) await deleteStudent(studentId);
      loadEnrollments();
    } catch (err) { alert('Failed to delete'); }
  };

  const filteredEnrollments = enrollments.filter(e =>
    (e.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.gradeLevel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.section || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEnroll = user.role === 'Teacher';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Enrollments (SY 2026-2027)</h2>
        {canEnroll && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Enroll Student
          </button>
        )}
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by name, grade, or section..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>LRN</th>
              <th>Student Name</th>
              <th>Grade Level</th>
              <th>Section</th>
              <th>School Year</th>
              <th>Enrollment Date</th>
              {user.role === 'Teacher' && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEnrollments.map(enrollment => (
              <tr key={enrollment.id}>
                <td>{enrollment.lrn || enrollment.student?.lrn || '—'}</td>
                <td>{enrollment.studentName || `${enrollment.student?.firstName || ''} ${enrollment.student?.lastName || ''}`}</td>
                <td>{enrollment.gradeLevel}</td>
                <td>{enrollment.section}</td>
                <td>{enrollment.schoolYear || enrollment.schoolYearId || '2026-2027'}</td>
                <td>{new Date(enrollment.enrollmentDate).toLocaleDateString()}</td>
                {user.role === 'Teacher' && (
                  <td className="actions">
                    {enrollment.isAdviser && (
                      <>
                        <button onClick={() => handleEdit(enrollment)} className="icon-btn edit" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(enrollment.id, enrollment.student?.id || enrollment.studentId)} className="icon-btn delete" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editEnrollment ? 'Edit Enrollment' : 'Enroll Student (New Admission)'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group"><label>LRN *</label><input value={formData.lrn} onChange={e => setFormData({...formData, lrn: e.target.value})} required /></div>
                <div className="form-group"><label>First Name *</label><input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required /></div>
                <div className="form-group"><label>Middle Name</label><input value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} /></div>
                <div className="form-group"><label>Last Name *</label><input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required /></div>
                <div className="form-group"><label>Suffix</label><input value={formData.suffix} onChange={e => setFormData({...formData, suffix: e.target.value})} /></div>
                <div className="form-group"><label>Gender *</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} required>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div className="form-group"><label>Birth Date *</label><input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} required /></div>
                <div className="form-group"><label>Address *</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required /></div>
                <div className="form-group"><label>Parent / Guardian *</label><input value={formData.parentGuardianName} onChange={e => setFormData({...formData, parentGuardianName: e.target.value})} required /></div>
                <div className="form-group"><label>Parent / Guardian Contact *</label><input value={formData.parentGuardianContact} onChange={e => setFormData({...formData, parentGuardianContact: e.target.value})} required /></div>
                <div className="form-group"><label>Previous School</label><input value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <div className="form-group"><label>Grade Level *</label>
                  <select value={formData.gradeLevel} onChange={e => setFormData({...formData, gradeLevel: e.target.value})} required>
                    {(user?.assignedGradeLevel ? [user.assignedGradeLevel] : GRADE_LEVELS).map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Section *</label><input value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} required placeholder="e.g., Mabini" /></div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save Enrollment</button>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Enrollments;