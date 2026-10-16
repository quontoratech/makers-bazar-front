import { AuthShell } from '@/features/auth/components/auth-shell';
import { SignupForm } from '@/features/auth/components/signup-form';

export default function SignupPage() {
    return (
        <AuthShell
            eyebrow="Customer account"
            title="Shop, book and discover with confidence"
            description="Create a verified customer profile for orders, tickets, downloads, wishlists, rewards, messages, and support."
            alternateLabel="Already registered? Sign in"
            alternateHref="/login"
        >
            <SignupForm />
        </AuthShell>
    );
}
