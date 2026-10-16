import { Suspense } from 'react';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

export default function ResetPasswordPage() {
    return <AuthShell eyebrow="Customer security" title="Create a private password" description="Choose a strong password to restore access to your customer account and order history." alternateLabel="Return to sign in" alternateHref="/login"><Suspense><ResetPasswordForm /></Suspense></AuthShell>;
}
