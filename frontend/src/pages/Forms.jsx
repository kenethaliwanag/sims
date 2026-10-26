import React, { useState, useEffect } from 'react';
import { getStudents, generateSF1, generateSF9, generateSF10 } from '../services/api';
import { FileText, Download } from 'lucide-react';
import './Forms.css';

const GRADE_LEVELS = ['Kindergarten', 'SNED', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

function Forms({ user }) {
  const [formType, setFormType] = useState('SF1');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let blob;
      const schoolYearId = 2; // shortcut: hardcoded active school year, should fetch from API

      if (formType === 'SF1') {
        blob = await generateSF1(schoolYearId, gradeLevel || null);
      } else if (formType === 'SF9') {
        if (!selectedStudent) {
          alert('Please select a student');
          return;
        }
        blob = await generateSF9(parseInt(selectedStudent), schoolYearId);
      } else if (formType === 'SF10') {
        if (!selectedStudent) {
          alert('Please select a student');
          return;
        }
        blob = await generateSF10(parseInt(selectedStudent));
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formType}_${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to generate form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>DepEd Forms Generator</h2>
      </div>

      <div className="forms-content">
        <div className="form-selector">
          <div className="form-type-cards">
            <div
              className={`form-card ${formType === 'SF1' ? 'active' : ''}`}
              onClick={() => setFormType('SF1')}
            >
              <FileText size={32} />
              <h3>SF1</h3>
              <p>School Register</p>
              <span className="form-desc">Master list of enrolled learners</span>
            </div>

            <div
              className={`form-card ${formType === 'SF9' ? 'active' : ''}`}
              onClick={() => setFormType('SF9')}
            >
              <FileText size={32} />
              <h3>SF9</h3>
              <p>Progress Report Card</p>
              <span className="form-desc">Learner's quarterly grades</span>
            </div>

            <div
              className={`form-card ${formType === 'SF10' ? 'active' : ''}`}
              onClick={() => setFormType('SF10')}
            >
              <FileText size={32} />
              <h3>SF10</h3>
              <p>Permanent Record</p>
              <span className="form-desc">Complete academic history</span>
            </div>
          </div>
        </div>

        <div className="form-options">
          <h3>Generate {formType}</h3>

          {formType === 'SF1' && (
            <div className="form-group">
              <label>Grade Level (Optional - leave empty for all)</label>
              <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                <option value="">All Grades</option>
                {GRADE_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          )}

          {(formType === 'SF9' || formType === 'SF10') && (
            <div className="form-group">
              <label>Select Student *</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required>
                <option value="">-- Select Student --</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.lastName}, {student.firstName} ({student.lrn})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn-primary btn-generate"
            onClick={handleGenerate}
            disabled={loading}
          >
            <Download size={20} />
            {loading ? 'Generating...' : `Generate ${formType} PDF`}
          </button>

          <div className="form-info">
            <h4>About {formType}</h4>
            {formType === 'SF1' && (
              <p>The School Register (SF1) contains the master list of all enrolled learners for the current school year. It includes basic information such as LRN, name, gender, birth date, grade level, and section.</p>
            )}
            {formType === 'SF9' && (
              <p>The Learner's Progress Report Card (SF9) shows quarterly grades for all subjects. This replaces the old Form 138 and is given to learners each grading period.</p>
            )}
            {formType === 'SF10' && (
              <p>The Learner's Permanent Academic Record (SF10) contains the complete academic history of a learner. This replaces the old Form 137 and follows the learner throughout their education.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Forms;
