import { AuthShell } from '@/features/auth/components/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; returnTo?: string }> }) {
    const { expired, returnTo } = await searchParams;
    return (
        <AuthShell
            eyebrow="One account, one approved role"
            title="Welcome back to The Makers Bazar"
            description="Customers, vendors, influencers, organizers, and administrators enter through one secure login and are routed only to their assigned workspace."
            alternateLabel="New customer? Create an account"
            alternateHref={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : '/signup'}
        >
            <LoginForm
                returnTo={returnTo}
                initialMessage={expired === '1' ? 'Your session expired. Please sign in again to continue.' : undefined}
            />
        </AuthShell>
    );
}
