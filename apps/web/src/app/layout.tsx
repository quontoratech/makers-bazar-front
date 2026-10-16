import type { Metadata } from 'next';

import './globals.css';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'The Makers Bazar';

export const metadata: Metadata = {
    title: {
        default: `${siteName} | Local products and experiences`,
        template: `%s | ${siteName}`,
    },
    description:
        'Discover trusted local makers, food brands, services, workshops, events, and digital products.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
            </head>
            <body className="font-sans antialiased">{children}</body>
        </html>
    );
}
