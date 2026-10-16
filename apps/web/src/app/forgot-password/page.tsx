import { AuthShell } from '@/features/auth/components/auth-shell';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export default function ForgotPasswordPage() {
    return <AuthShell eyebrow="Customer security" title="Recover access safely" description="Password reset links are single-use and sent only to the registered customer email address." alternateLabel="Return to sign in" alternateHref="/login"><ForgotPasswordForm /></AuthShell>;
}
