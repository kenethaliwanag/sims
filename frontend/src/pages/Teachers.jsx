import React, { useState, useEffect } from 'react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, createTeacherAccount } from '../services/api';
import { Search, Plus, Edit2, Trash2, KeyRound, Eye } from 'lucide-react';
import './Teachers.css';

function Teachers({ user }) {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewTeacher, setViewTeacher] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [accountTeacher, setAccountTeacher] = useState(null);
  const [accountData, setAccountData] = useState({ username: '', password: '' });
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', gender: 'Male',
    birthDate: '', address: '', position: '', maritalStatus: 'Single',
    assignedGradeLevel: 'Grade 1', assignedSubjects: ''
  });

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    const filtered = teachers.filter(t =>
      t.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeachers(filtered);
  }, [searchTerm, teachers]);

  const loadTeachers = async () => {
    try {
      const data = await getTeachers();
      setTeachers(data);
      setFilteredTeachers(data);
    } catch (err) {
      alert('Failed to load teachers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, { ...formData, id: editingTeacher.id });
      } else {
        await createTeacher(formData);
      }
      loadTeachers();
      closeModal();
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      firstName: teacher.firstName,
      middleName: teacher.middleName || '',
      lastName: teacher.lastName,
      gender: teacher.gender,
      birthDate: teacher.birthDate.split('T')[0],
      address: teacher.address,
      position: teacher.position,
      maritalStatus: teacher.maritalStatus,
      assignedGradeLevel: teacher.assignedGradeLevel || 'Grade 1',
      assignedSubjects: teacher.assignedSubjects || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    try {
      await deleteTeacher(id);
      loadTeachers();
    } catch (err) {
      alert('Failed to delete teacher');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accountTeacher) return;
    try {
      await createTeacherAccount(accountTeacher.id, accountData);
      alert('Login account created for ' + accountTeacher.firstName + ' ' + accountTeacher.lastName);
      setAccountTeacher(null);
      setAccountData({ username: '', password: '' });
      loadTeachers();
    } catch (err) {
      alert(err.message || 'Failed to create login account');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    setFormData({
      firstName: '', middleName: '', lastName: '', gender: 'Male',
      birthDate: '', address: '', position: '', maritalStatus: 'Single',
      assignedGradeLevel: 'Grade 1', assignedSubjects: ''
    });
  };

  const canEdit = user.role === 'Admin';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Teachers Management</h2>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Teacher
          </button>
        )}
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Middle Name</th>
              <th>Gender</th>
              <th>Position</th>
              <th>Advisory Class</th>
              {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map(teacher => (
              <tr key={teacher.id}>
                <td>{teacher.lastName}</td>
                <td>{teacher.firstName}</td>
                <td>{teacher.middleName}</td>
                <td>{teacher.gender}</td>
                <td>{teacher.position}</td>
                <td>{teacher.advisoryClass || '—'}</td>
                {canEdit && (
                  <td className="actions">
                    <button onClick={() => setViewTeacher(teacher)} className="icon-btn" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEdit(teacher)} className="icon-btn edit">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (teacher.hasAccount) { alert('Login: ' + teacher.username); return; }
                        setAccountTeacher(teacher);
                        setAccountData({ username: '', password: '' });
                      }}
                      className="icon-btn"
                      title={teacher.hasAccount ? 'Login: ' + teacher.username : 'Create Login'}
                      style={{ color: teacher.hasAccount ? '#059669' : undefined }}
                    >
                      <KeyRound size={16} />
                    </button>
                    <button onClick={() => handleDelete(teacher.id)} className="icon-btn delete">
                      <Trash2 size={16} />
                    </button>
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
            <h3>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</h3>
            <form onSubmit={handleSubmit}>
              <input placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
              <input placeholder="Middle Name" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} />
              <input placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} required />
              <textarea placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
              <input placeholder="Position (e.g., Teacher I)" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} required />
              <select value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
              <select value={formData.assignedGradeLevel} onChange={(e) => setFormData({ ...formData, assignedGradeLevel: e.target.value })}>
                {['Kindergarten','SNED','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'].map(l => <option key={l}>{l}</option>)}
              </select>
              <input placeholder="Assigned Subjects (e.g., Mathematics,English)" value={formData.assignedSubjects} onChange={(e) => setFormData({ ...formData, assignedSubjects: e.target.value })} />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewTeacher && (
        <div className="modal-overlay" onClick={() => setViewTeacher(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Teacher Profile</h3>
              <button onClick={() => setViewTeacher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            
            <div className="view-details">
              <div className="detail-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <label>Full Name</label>
                <p style={{ fontSize: '1.25rem', fontWeight: '700' }}>{viewTeacher.firstName} {viewTeacher.middleName ? `${viewTeacher.middleName} ` : ''}{viewTeacher.lastName}</p>
              </div>
              <div className="detail-group">
                <label>Position</label>
                <p>{viewTeacher.position}</p>
              </div>
              <div className="detail-group">
                <label>Gender</label>
                <p>{viewTeacher.gender}</p>
              </div>
              <div className="detail-group">
                <label>Birth Date</label>
                <p>{new Date(viewTeacher.birthDate).toLocaleDateString()}</p>
              </div>
              <div className="detail-group">
                <label>Marital Status</label>
                <p>{viewTeacher.maritalStatus}</p>
              </div>
              <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <p>{viewTeacher.address}</p>
              </div>
              <div className="detail-group">
                <label>Assigned Grade Level</label>
                <p>{viewTeacher.assignedGradeLevel || '—'}</p>
              </div>
              <div className="detail-group">
                <label>Subjects Handled</label>
                <p>{viewTeacher.assignedSubjects || '—'}</p>
              </div>
              <div className="detail-group" style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <label>Schedule / Time</label>
                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Master schedule data not yet available</p>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setViewTeacher(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {accountTeacher && (
        <div className="modal-overlay" onClick={() => setAccountTeacher(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Login — {accountTeacher.firstName} {accountTeacher.lastName}</h3>
            <form onSubmit={handleCreateAccount}>
              <input
                placeholder="Username"
                value={accountData.username}
                onChange={(e) => setAccountData({ ...accountData, username: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={accountData.password}
                onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                required
              />
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
                Grade Level: {accountTeacher.assignedGradeLevel || 'N/A'}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
                Share this initial password with the teacher. They can change it themselves under
                Change Password after signing in.
              </p>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Create Login</button>
                <button type="button" className="btn-secondary" onClick={() => setAccountTeacher(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teachers;
