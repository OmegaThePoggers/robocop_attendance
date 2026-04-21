import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono' });

export const metadata = {
    title: {
        default: 'Robocop Attendance System',
        template: '%s | Robocop',
    },
    description: 'Face recognition-based attendance tracking system',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.variable} ${robotoMono.variable} antialiased bg-background text-textMain min-h-screen selection:bg-accent/30 selection:text-textMain`}>
                {children}
            </body>
        </html>
    );
}
