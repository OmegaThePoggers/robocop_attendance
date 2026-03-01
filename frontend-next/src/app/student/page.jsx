"use client";

import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import StudentDashboard from '../../components/StudentDashboard';

export default function StudentPage() {
    return (
        <AppShell>
            <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
            </ProtectedRoute>
        </AppShell>
    );
}
