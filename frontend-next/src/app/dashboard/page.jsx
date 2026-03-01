"use client";

import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import Dashboard from '../../components/Dashboard';

export default function DashboardPage() {
    return (
        <AppShell>
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <Dashboard />
            </ProtectedRoute>
        </AppShell>
    );
}
