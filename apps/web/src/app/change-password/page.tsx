import { AuthShell } from '@/features/auth/components/auth-shell';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';

export default function ChangePasswordPage() {
    return (
        <AuthShell
            eyebrow="Approved role account"
            title="Secure your new workspace"
            description="Temporary credentials are valid only for the first login. Your new password unlocks the role approved by The Makers Bazar team."
            alternateLabel="Return to the storefront"
            alternateHref="/"
        >
            <ChangePasswordForm />
        </AuthShell>
    );
}
