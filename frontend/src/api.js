const API_URL = 'http://localhost:8000';

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

    if (!response.ok) throw new Error('Login failed');
    return await response.json();
}

export async function registerUser(username, password, fullName, faceIdentity) {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password,
            full_name: fullName,
            face_identity: faceIdentity,
            role: 'student'
        })
    });
    if (!response.ok) throw new Error('Registration failed');
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

export async function createSession(name) {
    const response = await fetch(`${API_URL}/sessions?name=${encodeURIComponent(name)}`, {
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

export async function recognizeImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Note: Do NOT set Content-Type for FormData, browser sets it with boundary
    const headers = getAuthHeaders(null);

    const response = await fetch(`${API_URL}/recognize/image`, {
        method: 'POST',
        headers: headers,
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Image recognition failed');
    }
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
