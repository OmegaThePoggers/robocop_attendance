const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const STATIC_URL = `${API_URL}/static`;

function getAuthHeaders(contentType = 'application/json') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_URL}${path}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`GET ${path}:`, e);
        return null;
    }
}

async function apiPost(path, body, expectJson = true) {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
    }
    return expectJson ? res.json() : res;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginUser(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const res = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Login failed'); }
    return res.json();
}

export async function logoutUser() {
    try {
        await fetch(`${API_URL}/logout`, { method: 'POST', headers: getAuthHeaders() });
    } catch (_) {}
    localStorage.removeItem('token');
}

export async function getMe() {
    return apiGet('/me');
}

export async function updateProfile(data) {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) formData.append(k, v); });
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/me`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) throw new Error('Profile update failed');
    return res.json();
}

export async function registerUser(username, password, fullName, sapId, file, extras = {}) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('full_name', fullName);
    formData.append('sap_id', sapId);
    formData.append('role', 'student');
    formData.append('selfie', file);
    Object.entries(extras).forEach(([k, v]) => { if (v) formData.append(k, v); });
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Registration failed'); }
    return res.json();
}

export async function registerTeacher(username, password, fullName, extras = {}) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('full_name', fullName);
    Object.entries(extras).forEach(([k, v]) => { if (v !== undefined && v !== null) formData.append(k, String(v)); });
    const res = await fetch(`${API_URL}/register-teacher`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Registration failed'); }
    return res.json();
}

// ── Attendance (Robocop) ───────────────────────────────────────────────────

export async function checkHealth() {
    try { const r = await fetch(`${API_URL}/health`); return r.ok; } catch { return false; }
}
export async function getAttendance() { return (await apiGet('/attendance')) || []; }
export async function getAbsentees() { return (await apiGet('/attendance/absent')) || []; }
export async function getMyAttendance() { return (await apiGet('/attendance/my')) || []; }
export async function createSession(name, classId) {
    const url = classId ? `${API_URL}/sessions?name=${encodeURIComponent(name)}&class_id=${classId}` : `${API_URL}/sessions?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
}
export async function getActiveSession() {
    try { const r = await fetch(`${API_URL}/sessions/active`, { headers: getAuthHeaders() }); if (!r.ok) return null; return r.json(); } catch { return null; }
}
export async function endSession() {
    const r = await fetch(`${API_URL}/sessions/end`, { method: 'POST', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed to end session');
    return r.json();
}
export async function getSessionHistory() { return (await apiGet('/sessions')) || []; }
export async function getSessionReport(id) { return apiGet(`/sessions/${id}/report`); }
export async function getSessionEvidence(id) { return (await apiGet(`/sessions/${id}/evidence`)) || []; }
export async function manualMark(studentName, sessionId) {
    const r = await fetch(`${API_URL}/attendance/manual?student_name=${encodeURIComponent(studentName)}&session_id=${sessionId}`, { method: 'POST', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed to mark manually');
    return r.json();
}
export async function recognizeImage(sessionId, file) {
    const fd = new FormData(); fd.append('file', file);
    const url = sessionId ? `${API_URL}/recognize/image?session_id=${sessionId}` : `${API_URL}/recognize/image`;
    const r = await fetch(url, { method: 'POST', headers: getAuthHeaders(null), body: fd });
    if (!r.ok) throw new Error('Recognition failed');
    return r.json();
}
export async function detectFaces(file) {
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch(`${API_URL}/detect-faces`, { method: 'POST', headers: getAuthHeaders(null), body: fd });
    if (!r.ok) return { faces: [] };
    return r.json();
}
export async function recognizeVideo(file) {
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch(`${API_URL}/recognize/video`, { method: 'POST', headers: getAuthHeaders(null), body: fd });
    if (!r.ok) throw new Error('Video recognition failed');
    return r.json();
}
export async function getUnknowns() { return (await apiGet('/sessions/active/unknowns')) || []; }
export async function resolveUnknown(id, studentName) {
    const r = await fetch(`${API_URL}/unknowns/${id}/resolve?student_name=${encodeURIComponent(studentName)}`, { method: 'POST', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}

// ── Disputes ───────────────────────────────────────────────────────────────

export async function createDispute(sessionId, description, attendanceSourceId = null, selectedFaceCoords = null) {
    return apiPost('/disputes', { session_id: sessionId, description, attendance_source_id: attendanceSourceId, selected_face_coords: selectedFaceCoords });
}
export async function getMyDisputes() { return (await apiGet('/disputes/my')) || []; }
export async function getAllDisputes() { return (await apiGet('/disputes')) || []; }
export async function resolveDispute(id, status) {
    const r = await fetch(`${API_URL}/disputes/${id}/resolve?status=${status}`, { method: 'POST', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function getAllUsers() { return (await apiGet('/admin/users')) || []; }
export async function mapUserIdentity(username, faceIdentity) { return apiPost('/admin/map-identity', { username, face_identity: faceIdentity }); }
export async function getAuditLogs() { return (await apiGet('/admin/audit-logs')) || []; }
export async function getClasses() { return (await apiGet('/admin/classes')) || []; }
export async function createClass(name, description) { return apiPost('/admin/classes', { name, description }); }
export async function getUnassignedStudents() { return (await apiGet('/admin/users/students/unassigned')) || []; }
export async function assignStudentClass(userId, classId) {
    const r = await fetch(`${API_URL}/admin/users/${userId}/assign-class`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ class_id: classId }) });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}
export async function getDatabaseTables() { return (await apiGet('/admin/database/tables')) || []; }
export async function getTableData(table, limit = 100, offset = 0) { return (await apiGet(`/admin/database/${table}?limit=${limit}&offset=${offset}`)) || { data: [], total: 0 }; }

// ── Admin Account Management ──────────────────────────────────────────────

export async function adminCreateUser(data) { return apiPost('/admin/users', data); }
export async function adminBatchCreate(users) { return apiPost('/admin/users/batch', { users }); }
export async function adminDeleteUser(userId) {
    const r = await fetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Delete failed'); }
    return r.json();
}
export async function adminBatchDelete(userIds) {
    const r = await fetch(`${API_URL}/admin/users/batch`, {
        method: 'DELETE', headers: getAuthHeaders(), body: JSON.stringify({ user_ids: userIds }),
    });
    if (!r.ok) throw new Error('Batch delete failed');
    return r.json();
}
export async function adminUpdateRole(userId, role) {
    const r = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ role }),
    });
    if (!r.ok) throw new Error('Role update failed');
    return r.json();
}
export async function adminResetPassword(userId) {
    return apiPost(`/admin/users/${userId}/reset-password`, {});
}

export async function fetchStudentPhoto(username) {
    const res = await fetch(`${API_URL}/admin/users/${username}/photo`, { headers: getAuthHeaders() });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

// ── Doubts (Cogni) ─────────────────────────────────────────────────────────

export async function submitDoubt(text, subject = null, autoSolve = true) {
    return apiPost('/doubts', { text, subject, auto_solve: autoSolve });
}
export async function getMyDoubts() { return (await apiGet('/doubts/my')) || []; }
export async function getAllDoubts() { return (await apiGet('/doubts/all')) || []; }
export async function getDoubtMessages(doubtId) { return (await apiGet(`/doubts/${doubtId}/messages`)) || []; }
export async function replyToDoubt(doubtId, text) { return apiPost(`/doubts/${doubtId}/reply`, { text }); }
export async function resolveDoubt(doubtId, teacherNote = '') { return apiPost(`/doubts/${doubtId}/resolve`, { teacher_note: teacherNote }); }

// ── Assignments ────────────────────────────────────────────────────────────

export async function getAssignments() { return (await apiGet('/assignments')) || []; }
export async function createAssignment(data) { return apiPost('/assignments', data); }
export async function submitAssignment(assignmentId, submissionText) {
    return apiPost(`/assignments/${assignmentId}/submit`, { submission_text: submissionText });
}
export async function getSubmissions(assignmentId) { return (await apiGet(`/assignments/${assignmentId}/submissions`)) || []; }
export async function gradeSubmission(assignmentId, submissionId, grade, feedback) {
    return apiPost(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, { grade, feedback });
}

// ── Marks / Results ────────────────────────────────────────────────────────

export async function getMyMarks() { return apiGet('/marks/my'); }
export async function getStudentMarks(username) { return apiGet(`/marks/student/${username}`); }
export async function upsertMark(data) {
    const r = await fetch(`${API_URL}/marks`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}

// ── Notifications ──────────────────────────────────────────────────────────

export async function getNotifications() { return (await apiGet('/notifications')) || []; }
export async function markNotifRead(id) {
    const r = await fetch(`${API_URL}/notifications/read/${id}`, { method: 'POST', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}
export async function markAllNotifsRead() {
    const r = await fetch(`${API_URL}/notifications/read-all`, { method: 'POST', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}

// ── Library ────────────────────────────────────────────────────────────────

export async function getResources(subject = null, type = null) {
    let url = '/library';
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (type) params.push(`resource_type=${encodeURIComponent(type)}`);
    if (params.length) url += '?' + params.join('&');
    return (await apiGet(url)) || [];
}
export async function createResource(data) { return apiPost('/library', data); }
export async function deleteResource(id) {
    const r = await fetch(`${API_URL}/library/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}

// ── Schedule ───────────────────────────────────────────────────────────────

export async function getSchedule() { return (await apiGet('/schedule')) || []; }
export async function createScheduleEntry(data) { return apiPost('/schedule', data); }
export async function deleteScheduleEntry(id) {
    const r = await fetch(`${API_URL}/schedule/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!r.ok) throw new Error('Failed');
    return r.json();
}

// ── Chat ───────────────────────────────────────────────────────────────────

export async function getChatContacts() { return (await apiGet('/chat/contacts')) || []; }
export async function getChatMessages(otherUsername) { return (await apiGet(`/chat/messages/${otherUsername}`)) || []; }
export async function sendChatMessage(recipientUsername, text) {
    return apiPost('/chat/messages', { recipient_username: recipientUsername, text });
}
export async function sendAIChat(messages) {
    return apiPost('/chat/ai', { messages });
}
