import { redirect } from 'next/navigation';

import { getMarketplaceSession } from '@/lib/auth/server-session';

export default async function AccountPage() {
    const session = await getMarketplaceSession();
    if (!session) redirect('/login');
    redirect(session.mustChangePassword ? '/change-password' : session.dashboardPath);
}
