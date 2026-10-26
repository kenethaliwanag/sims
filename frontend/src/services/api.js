const API_BASE = 'http://localhost:8080/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              refreshToken, 
              token: localStorage.getItem('token') 
            })
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            
            // Retry the original request with the new token
            const retryHeaders = { ...getAuthHeader() };
            // We can't easily retry the original fetch call here without 
            // wrapping the fetch logic. We will handle it by throwing 
            // a specific error or letting the user know. 
            // For simplicity in a "lite" implementation, we update the token 
            // and let the user refresh the page or retry.
          } else {
            throw new Error('Refresh failed');
          }
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    throw new Error(await response.text() || 'Request failed');
  }
  return response.headers.get('content-type')?.includes('application/json')
    ? response.json()
    : response.blob();
};

// Auth
export const login = async (username, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await handleResponse(response);
  localStorage.setItem('token', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
};

// Self-service password change for any signed-in user.
export const changePassword = async (currentPassword, newPassword) => {
  const response = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse(response);
};

// Teachers
export const getTeachers = async () => {
  const response = await fetch(`${API_BASE}/teachers`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const createTeacher = async (data) => {
  const response = await fetch(`${API_BASE}/teachers`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const updateTeacher = async (id, data) => {
  const response = await fetch(`${API_BASE}/teachers/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const deleteTeacher = async (id) => {
  const response = await fetch(`${API_BASE}/teachers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const createTeacherAccount = async (id, data) => {
  const response = await fetch(`${API_BASE}/teachers/${id}/account`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

// Students
export const getStudents = async () => {
  const response = await fetch(`${API_BASE}/students`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const getStudent = async (id) => {
  const response = await fetch(`${API_BASE}/students/${id}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const createStudent = async (data) => {
  const response = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const updateStudent = async (id, data) => {
  const response = await fetch(`${API_BASE}/students/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const deleteStudent = async (id) => {
  const response = await fetch(`${API_BASE}/students/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Enrollments
export const getEnrollments = async (schoolYearId, scope) => {
  const params = new URLSearchParams();
  if (schoolYearId) params.set('schoolYearId', schoolYearId);
  if (scope) params.set('scope', scope);
  const query = params.toString();
  const url = query ? `${API_BASE}/enrollments?${query}` : `${API_BASE}/enrollments`;
  const response = await fetch(url, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const updateEnrollment = async (id, data) => {
  const response = await fetch(`${API_BASE}/enrollments/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const getEnrollmentStats = async (schoolYearId) => {
  const url = schoolYearId ? `${API_BASE}/enrollments/stats?schoolYearId=${schoolYearId}` : `${API_BASE}/enrollments/stats`;
  const response = await fetch(url, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const createEnrollment = async (data) => {
  const response = await fetch(`${API_BASE}/enrollments`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const deleteEnrollment = async (id) => {
  const response = await fetch(`${API_BASE}/enrollments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Grades
export const getSubjects = async (gradeLevel) => {
  const url = gradeLevel ? `${API_BASE}/grades/subjects?gradeLevel=${encodeURIComponent(gradeLevel)}` : `${API_BASE}/grades/subjects`;
  const response = await fetch(url, { headers: getAuthHeader() });
  return handleResponse(response);
};

export const getGradesByEnrollment = async (enrollmentId) => {
  const response = await fetch(`${API_BASE}/grades/enrollment/${enrollmentId}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Subjects the signed-in user may encode for this enrollment (adviser: all, subject teacher: own load).
export const getMySubjects = async (enrollmentId) => {
  const response = await fetch(`${API_BASE}/grades/my-subjects/${enrollmentId}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Advisory sections + subject/section loads the signed-in teacher can encode in.
export const getMyClasses = async () => {
  const response = await fetch(`${API_BASE}/grades/my-classes`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const createGrade = async (data) => {
  const response = await fetch(`${API_BASE}/grades`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const updateGrade = async (id, data) => {
  const response = await fetch(`${API_BASE}/grades/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const deleteGrade = async (id) => {
  const response = await fetch(`${API_BASE}/grades/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Teaching assignments (Admin)
export const getAssignments = async (teacherId) => {
  const url = teacherId ? `${API_BASE}/teaching-assignments?teacherId=${teacherId}` : `${API_BASE}/teaching-assignments`;
  const response = await fetch(url, { headers: getAuthHeader() });
  return handleResponse(response);
};

export const createAssignment = async (data) => {
  const response = await fetch(`${API_BASE}/teaching-assignments`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const deleteAssignment = async (id) => {
  const response = await fetch(`${API_BASE}/teaching-assignments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Recent activity feed (Admin)
export const getActivity = async (limit = 100) => {
  const response = await fetch(`${API_BASE}/activity?limit=${limit}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

// Forms
export const generateSF1 = async (schoolYearId, gradeLevel) => {
  const response = await fetch(`${API_BASE}/forms/sf1`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolYearId, gradeLevel })
  });
  return handleResponse(response);
};

export const generateSF9 = async (studentId, schoolYearId) => {
  const response = await fetch(`${API_BASE}/forms/sf9`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, schoolYearId })
  });
  return handleResponse(response);
};

export const generateSF10 = async (studentId) => {
  const response = await fetch(`${API_BASE}/forms/sf10`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId })
  });
  return handleResponse(response);
};
