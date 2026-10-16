import { ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { getMarketplaceVendors } from '@/features/catalog/services/marketplace-products.service';
import { MarketplaceReportForm } from '@/features/reports/components/marketplace-report-form';
import { getMarketplaceSession } from '@/lib/auth/server-session';

interface ReportSearchParams {
    targetType?: string;
    vendorProfileId?: string;
    vendorName?: string;
    productId?: string;
    listingName?: string;
    orderCode?: string;
    reportedUserId?: string;
    reportedUserName?: string;
    reportedUserEmail?: string;
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
    const [session, initial, vendors] = await Promise.all([getMarketplaceSession(), searchParams, getMarketplaceVendors(true)]);
    if (!session) {
        const query = new URLSearchParams(Object.entries(initial).filter((entry): entry is [string, string] => Boolean(entry[1])));
        const returnTo = query.size ? `/report?${query}` : '/report';
        redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    if (!['customer', 'vendor'].includes(session.role)) redirect(session.dashboardPath);
    return (
        <StorefrontShell>
            <section className="bg-[#fbf7e8] px-4 py-10 sm:px-6 sm:py-14">
                <div className="mx-auto max-w-[1180px]">
                    <div className="mb-8 border-b border-[#e4d6b5] pb-8">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#9b482b]"><ShieldAlert className="size-4"/>Trust and safety</div>
                        <h1 className="mt-3 font-display text-4xl leading-tight text-[#255038] sm:text-5xl">Report a safety concern</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d766f]">Report shops, listings, abusive users, or suspicious activity. Your submission goes directly to the super-admin review queue with your proof images.</p>
                    </div>
                    <MarketplaceReportForm reporterName={session.displayName} reporterEmail={session.identifier} vendors={vendors} initial={initial}/>
                </div>
            </section>
        </StorefrontShell>
    );
}
