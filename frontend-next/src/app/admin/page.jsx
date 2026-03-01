"use client";

import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import AdminDashboard from '../../components/AdminDashboard';

export default function AdminPage() {
    return (
        <AppShell>
            <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
            </ProtectedRoute>
        </AppShell>
    );
}
