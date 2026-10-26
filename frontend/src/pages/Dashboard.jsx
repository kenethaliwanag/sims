import React, { useState, useEffect } from 'react';
import { getEnrollmentStats, getActivity } from '../services/api';
import { Users, TrendingUp, RefreshCw } from 'lucide-react';
import './Dashboard.css';

const ACTIVITY_CATEGORY = {
  enrollment: 'Enrollment',
  student: 'Student',
  grade: 'Grade',
};

const timeAgo = (iso) => {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
};

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const isAdmin = user.role === 'Admin';

  useEffect(() => {
    loadStats();
    if (isAdmin) loadActivity();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getEnrollmentStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      setActivity(await getActivity(10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivity(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Welcome, {user.fullName}</h1>
      <p className="role-badge">{user.role}</p>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
              <Users size={32} color="white" />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Enrollees</p>
              <p className="stat-value">{stats.totalEnrollees}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
              <Users size={32} color="white" />
            </div>
            <div className="stat-content">
              <p className="stat-label">Male Students</p>
              <p className="stat-value">{stats.maleCount}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
              <Users size={32} color="white" />
            </div>
            <div className="stat-content">
              <p className="stat-label">Female Students</p>
              <p className="stat-value">{stats.femaleCount}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
              <TrendingUp size={32} color="white" />
            </div>
            <div className="stat-content">
              <p className="stat-label">School Year</p>
              <p className="stat-value">{stats.schoolYear}</p>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <section className="dashboard-activity">
          <div className="activity-heading">
            <div>
              <h2>Recent Activity</h2>
              <p className="muted">Student, enrollment and grade changes made by teachers.</p>
            </div>
            <button className="btn-secondary" onClick={loadActivity} disabled={loadingActivity}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="activity-panel">
            {activity.length === 0 && (
              <p className="muted" style={{ padding: 16 }}>
                No activity recorded yet.
              </p>
            )}

            {activity.map(item => {
              const category = item.action.split('.')[0];
              return (
                <div key={item.id} className="activity-row">
                  <span className={`activity-kind ${category}`}>
                    {ACTIVITY_CATEGORY[category] || 'Record'}
                  </span>
                  <div className="activity-body">
                    <p className="activity-summary">
                      <strong>{item.actorName}</strong> {item.description}
                    </p>
                    <p className="activity-meta">{item.actorRole}</p>
                  </div>
                  <span
                    className="activity-time"
                    title={new Date(item.createdAt).toLocaleString()}
                  >
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
