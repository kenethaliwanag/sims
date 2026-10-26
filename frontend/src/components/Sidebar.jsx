import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, BookOpen, FileText, LogOut, ClipboardList, Briefcase, KeyRound } from 'lucide-react';
import { changePassword } from '../services/api';
import logo from '../img/vaes-logo.png';
import './Sidebar.css';

function Sidebar({ user, onLogout, isOpen, setIsOpen }) {
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleNavItemClick = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      alert('Password changed. Use the new password next time you log in.');
      setShowPassword(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      // ASP.NET returns the reason as a quoted JSON string.
      setPasswordError((err.message || 'Failed to change password').replace(/^"|"$/g, ''));
    } finally {
      setSavingPassword(false);
    }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Registrar', 'Teacher'] },
    { path: '/teachers', label: 'Teachers', icon: Briefcase, roles: ['Admin'] },
    { path: '/teaching-load', label: 'Teaching Load', icon: ClipboardList, roles: ['Admin'] },
    { path: '/students', label: 'Students', icon: Users, roles: ['Admin', 'Registrar', 'Teacher'] },
    { path: '/enrollments', label: 'Enrollments', icon: GraduationCap, roles: ['Admin', 'Registrar', 'Teacher'] },
    { path: '/grades', label: 'Grades', icon: BookOpen, roles: ['Admin', 'Teacher', 'Registrar'] },
    { path: '/forms', label: 'DepEd Forms', icon: FileText, roles: ['Admin', 'Registrar', 'Teacher'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src={logo} alt="Villa Antonio Elementary School logo" className="sidebar-logo" />
        <h2>Villa Antonio</h2>
        <p>Elementary School</p>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavItemClick}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user.fullName.charAt(0)}</div>
          <div className="user-details">
            <p className="user-name">{user.fullName}</p>
            <p className="user-role">{user.role}</p>
          </div>
        </div>
        <button className="password-btn" onClick={() => { setPasswordError(''); setShowPassword(true); }}>
          <KeyRound size={18} />
          Change Password
        </button>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {showPassword && (
        <div className="modal-overlay" onClick={() => setShowPassword(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Signed in as <strong>{user.fullName}</strong> ({user.role})
            </p>
            <form onSubmit={handleChangePassword}>
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="New password (at least 6 characters)"
                minLength={6}
                value={passwordForm.next}
                onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                minLength={6}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                required
              />
              {passwordError && (
                <div style={{ color: '#dc2626', fontSize: 13 }}>{passwordError}</div>
              )}
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Saving...' : 'Change Password'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowPassword(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
