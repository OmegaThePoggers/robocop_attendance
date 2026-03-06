"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

function ProtectedRoute({ children, allowedRoles }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
                localStorage.removeItem('token');
                router.replace('/login');
                return;
            }

            if (allowedRoles && !allowedRoles.includes(decoded.role)) {
                router.replace('/');
                return;
            }

            setAuthorized(true);
        } catch (e) {
            localStorage.removeItem('token');
            router.replace('/login');
        }
    }, [router, allowedRoles]);

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-bg">
                <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return children;
}

export default ProtectedRoute;
