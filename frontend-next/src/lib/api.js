const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const STATIC_URL = `${API_URL}/static`;

function getAuthHeaders(contentType = 'application/json') {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
}

export async function loginUser(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Login failed');
    }
    return await response.json();
}

export async function registerUser(username, password, fullName, sapId, file, sourceParams = {}) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('full_name', fullName);
    formData.append('sap_id', sapId);
    formData.append('role', 'student');
    formData.append('selfie', file);

    const headers = getAuthHeaders(null); // Let browser set Content-Type multipart boundary

    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers,
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
    }
    return await response.json();
}

export async function registerTeacher(username, password, fullName) {
    const response = await fetch(`${API_URL}/register-teacher`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password,
            full_name: fullName,
            role: 'teacher'
        })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
    }
    return await response.json();
}

export async function getAttendance() {
    try {
        const response = await fetch(`${API_URL}/attendance`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to search attendance');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
}

export async function getAbsentees() {
    try {
        const response = await fetch(`${API_URL}/attendance/absent`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch absentees');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
}

export async function createSession(name, classId) {
    const response = await fetch(`${API_URL}/sessions?name=${encodeURIComponent(name)}&class_id=${classId}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to create session');
    return await response.json();
}

export async function getActiveSession() {
    try {
        const response = await fetch(`${API_URL}/sessions/active`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data; // might be null if no content
    } catch {
        return null;
    }
}

export async function endSession() {
    const response = await fetch(`${API_URL}/sessions/end`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to end session');
    return await response.json();
}

export async function getSessionHistory() {
    try {
        const response = await fetch(`${API_URL}/sessions`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch {
        return [];
    }
}

export async function getSessionReport(sessionId) {
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/report`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch report');
        return await response.json();
    } catch {
        return null;
    }
}

export async function manualMark(studentName, sessionId) {
    const response = await fetch(`${API_URL}/attendance/manual?student_name=${encodeURIComponent(studentName)}&session_id=${sessionId}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to mark manually');
    return await response.json();
}

export async function checkHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        return response.ok;
    } catch (e) {
        return false;
    }
}

export async function recognizeImage(sessionId, file) {
    const formData = new FormData();
    formData.append('file', file);

    // Note: Do NOT set Content-Type for FormData, browser sets it with boundary
    const headers = getAuthHeaders(null);

    let url = `${API_URL}/recognize/image`;
    if (sessionId) {
        url += `?session_id=${sessionId}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Image recognition failed');
    }
    return await response.json();
}

export async function detectFaces(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getAuthHeaders(null);

    const response = await fetch(`${API_URL}/detect-faces`, {
        method: 'POST',
        headers: headers,
        body: formData,
    });
    if (!response.ok) return { faces: [] };
    return await response.json();
}

export async function recognizeVideo(file) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = getAuthHeaders(null);

    const response = await fetch(`${API_URL}/recognize/video`, {
        method: 'POST',
        headers: headers,
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Video recognition failed');
    }
    return await response.json();
}

export async function getUnknowns() {
    try {
        const response = await fetch(`${API_URL}/sessions/active/unknowns`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return [];
        return await response.json();
    } catch {
        return [];
    }
}

export async function resolveUnknown(unknownId, studentName) {
    const response = await fetch(`${API_URL}/unknowns/${unknownId}/resolve?student_name=${encodeURIComponent(studentName)}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to resolve unknown face');
    return await response.json();
}

// Student & Dispute APIs
export async function getMyAttendance() {
    try {
        const response = await fetch(`${API_URL}/attendance/my`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch attendance');
        return await response.json();
    } catch {
        return [];
    }
}

export async function createDispute(sessionId, description, attendanceSourceId = null, selectedFaceCoords = null) {
    const response = await fetch(`${API_URL}/disputes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            session_id: sessionId,
            description: description,
            attendance_source_id: attendanceSourceId || null,
            selected_face_coords: selectedFaceCoords || null
        })
    });
    if (!response.ok) throw new Error('Failed to file dispute');
    return await response.json();
}

export async function getSessionEvidence(sessionId) {
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/evidence`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch evidence');
        return await response.json();
    } catch {
        return [];
    }
}

export async function getMyDisputes() {
    try {
        const response = await fetch(`${API_URL}/disputes/my`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch disputes');
        return await response.json();
    } catch {
        return [];
    }
}

// Admin API
export async function getAllDisputes() {
    try {
        const response = await fetch(`${API_URL}/disputes`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch disputes');
        return await response.json();
    } catch {
        return [];
    }
}

export async function resolveDispute(disputeId, status) {
    const response = await fetch(`${API_URL}/disputes/${disputeId}/resolve?status=${status}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to resolve dispute');
    return await response.json();
}

export async function getAllUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    } catch {
        return [];
    }
}

export async function mapUserIdentity(username, faceIdentity) {
    const response = await fetch(`${API_URL}/admin/map-identity`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, face_identity: faceIdentity })
    });
    if (!response.ok) throw new Error('Failed to map identity');
    return await response.json();
}

export async function getAuditLogs() {
    try {
        const response = await fetch(`${API_URL}/admin/audit-logs`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch logs');
        return await response.json();
    } catch {
        return [];
    }
}

export async function getClasses() {
    try {
        const response = await fetch(`${API_URL}/admin/classes`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch classes');
        return await response.json();
    } catch {
        return [];
    }
}

export async function createClass(name, description) {
    const response = await fetch(`${API_URL}/admin/classes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description })
    });
    if (!response.ok) throw new Error('Failed to create class');
    return await response.json();
}

export async function getUnassignedStudents() {
    try {
        const response = await fetch(`${API_URL}/admin/users/students/unassigned`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch unassigned students');
        return await response.json();
    } catch {
        return [];
    }
}

export async function assignStudentClass(userId, classId) {
    const response = await fetch(`${API_URL}/admin/users/${userId}/assign-class`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ class_id: classId })
    });
    if (!response.ok) throw new Error('Failed to assign class');
    return await response.json();
}

// Database Viewer APIs
export async function getDatabaseTables() {
    try {
        const response = await fetch(`${API_URL}/admin/database/tables`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch tables');
        return await response.json();
    } catch {
        return [];
    }
}

export async function getTableData(tableName, limit = 100, offset = 0) {
    try {
        const response = await fetch(`${API_URL}/admin/database/${tableName}?limit=${limit}&offset=${offset}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch table data');
        return await response.json();
    } catch {
        return { data: [], total: 0 };
    }
}
