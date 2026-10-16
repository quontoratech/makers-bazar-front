import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { CheckoutForm } from '@/features/checkout/components/checkout-form';
import { MarketplaceSubscriptionRenewal } from '@/features/bookings/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const renewalQuery = `
    query MarketplaceSubscriptionRenewal($token: String!) {
        marketplaceSubscriptionRenewal(token: $token) {
            bookingId productId productVariantId productName productSlug variantName sku
            vendorProfileId vendorName vendorSlug price className graceEndsAt periodDays nextStartsAt nextEndsAt
        }
    }
`;

export default async function SubscriptionRenewalPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const [{ token }, session, authToken] = await Promise.all([
        searchParams,
        getMarketplaceSession(),
        getMarketplaceAuthToken(),
    ]);
    if (!session || session.role !== 'customer' || !authToken) {
        redirect(`/login?returnTo=${encodeURIComponent(`/subscriptions/renew?token=${String(token ?? '')}`)}`);
    }
    if (!token) {
        return <RenewalUnavailable message="This renewal link is incomplete." />;
    }

    let renewal: MarketplaceSubscriptionRenewal;
    try {
        const data = await authenticatedVendureRequest<{ marketplaceSubscriptionRenewal: MarketplaceSubscriptionRenewal }>(
            'shop', authToken, renewalQuery, { token }, session.channelToken,
        );
        renewal = data.marketplaceSubscriptionRenewal;
    } catch {
        return <RenewalUnavailable message="This renewal link is invalid, expired, or belongs to another customer account." />;
    }

    return (
        <StorefrontShell>
            <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
                <CheckoutForm
                    mode="buy-now"
                    customer={{ displayName: session.displayName, emailAddress: session.identifier }}
                    renewal={renewal!}
                    renewalToken={token}
                />
            </div>
        </StorefrontShell>
    );
}

function RenewalUnavailable({ message }: { message: string }) {
    return <StorefrontShell><div className="mx-auto max-w-xl px-5 py-16 text-center"><h1 className="text-3xl font-black text-[#222222]">Renewal unavailable</h1><p className="mt-3 text-sm leading-6 text-[#687770]">{message}</p><Link href="/dashboard/customer/bookings" className="mt-6 inline-flex h-11 items-center rounded-md bg-[#255038] px-5 text-sm font-bold text-white">Open bookings</Link></div></StorefrontShell>;
}
