import { AuthShell } from '@/features/auth/components/auth-shell';
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form';

export default function VerifyEmailPage() {
    return (
        <AuthShell
            eyebrow="Protecting your account"
            title="One quick verification step"
            description="Email verification keeps customer records, order history, bookings, and The Makers Bazar communication tied to the correct person."
            alternateLabel="Use a different email address"
            alternateHref="/signup"
        >
            <VerifyEmailForm />
        </AuthShell>
    );
}
