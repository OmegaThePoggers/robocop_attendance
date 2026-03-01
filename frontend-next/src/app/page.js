"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const role = decoded.role;

            if (role === 'student') {
                router.replace('/student');
            } else if (role === 'admin') {
                router.replace('/admin');
            } else {
                router.replace('/dashboard');
            }
        } catch {
            localStorage.removeItem('token');
            router.replace('/login');
        }
    }, [router]);

    return null;
}
