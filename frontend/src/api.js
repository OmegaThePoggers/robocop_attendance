const API_URL = 'http://localhost:8000';

export async function getAttendance() {
    try {
        const response = await fetch(`${API_URL}/attendance`);
        if (!response.ok) throw new Error('Failed to search attendance');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
}

export async function getAbsentees() {
    try {
        const response = await fetch(`${API_URL}/attendance/absent`);
        if (!response.ok) throw new Error('Failed to fetch absentees');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
}

export async function createSession(name) {
    const response = await fetch(`${API_URL}/sessions?name=${encodeURIComponent(name)}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to create session');
    return await response.json();
}

export async function getActiveSession() {
    try {
        const response = await fetch(`${API_URL}/sessions/active`);
        if (!response.ok) return null;
        const data = await response.json();
        return data; // might be null if no content
    } catch {
        return null;
    }
}

export async function manualMark(studentName, sessionId) {
    const response = await fetch(`${API_URL}/attendance/manual?student_name=${encodeURIComponent(studentName)}&session_id=${sessionId}`, { method: 'POST' });
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

    const response = await fetch(`${API_URL}/recognize/image`, {
        method: 'POST',
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

    const response = await fetch(`${API_URL}/recognize/video`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Video recognition failed');
    }
    return await response.json();
}
