"use client";

import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

function ProtectedRoute({ children, allowedRoles }) {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
        router.replace('/login');
        return null;
    }

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
            localStorage.removeItem('token');
            router.replace('/login');
            return null;
        }

        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            router.replace('/');
            return null;
        }
    } catch (e) {
        localStorage.removeItem('token');
        router.replace('/login');
        return null;
    }

    return children;
}

export default ProtectedRoute;
