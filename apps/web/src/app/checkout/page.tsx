import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { CheckoutForm } from '@/features/checkout/components/checkout-form';
import { getMarketplaceSession } from '@/lib/auth/server-session';

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ mode?: string; quote?: string }> }) {
    const [{ mode, quote }, session] = await Promise.all([searchParams, getMarketplaceSession()]);
    const customer = session?.role === 'customer'
        ? { displayName: session.displayName, emailAddress: session.identifier }
        : undefined;

    return (
        <StorefrontShell>
            <div className="mx-auto max-w-[1120px] px-5 pb-16 sm:px-8 sm:pb-24">
                <CheckoutForm
                    mode={quote ? 'quote' : mode === 'buy-now' ? 'buy-now' : 'cart'}
                    quoteId={quote}
                    customer={customer}
                />
            </div>
        </StorefrontShell>
    );
}
