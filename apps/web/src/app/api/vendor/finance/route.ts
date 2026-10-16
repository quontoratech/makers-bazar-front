import { NextRequest, NextResponse } from 'next/server';

import { getVendorFinance, updateVendorPayoutAccount } from '@/features/vendor-finance/services/vendor-finance.server';
import { VendorPayoutAccountPayload } from '@/features/vendor-finance/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

async function requireVendor() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session?.role === 'vendor' && session.apiType === 'admin' && token ? { session, token } : null;
}

export async function GET() {
    const auth = await requireVendor();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        return NextResponse.json(await getVendorFinance(auth.token, auth.session.channelToken), {
            headers: { 'cache-control': 'private, no-store' },
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load vendor finance' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireVendor();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    const body = await request.json() as { action?: string; input?: VendorPayoutAccountPayload };
    if (body.action !== 'UPDATE_PAYOUT_ACCOUNT' || !body.input) {
        return NextResponse.json({ message: 'Choose a valid finance action' }, { status: 400 });
    }
    try {
        await updateVendorPayoutAccount(auth.token, auth.session.channelToken, body.input);
        return NextResponse.json(await getVendorFinance(auth.token, auth.session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update payout account' }, { status: 400 });
    }
}
