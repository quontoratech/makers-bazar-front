import { NextRequest, NextResponse } from 'next/server';

import { deleteCustomerAddress, updateCustomerAddress } from '@/features/customer/services/customer-account.server';
import { CustomerAddressInput } from '@/features/customer/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

async function credentials() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session?.role === 'customer' && authToken ? { session, authToken } : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([credentials(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    const input = await request.json() as CustomerAddressInput;
    if (!input.streetLine1?.trim() || !input.city?.trim() || !input.countryCode?.trim()) {
        return NextResponse.json({ message: 'Street address, city, and country are required' }, { status: 400 });
    }
    try {
        return NextResponse.json(await updateCustomerAddress(auth.authToken, auth.session.channelToken, id, input));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update address' }, { status: 400 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([credentials(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    try {
        return NextResponse.json({ success: await deleteCustomerAddress(auth.authToken, auth.session.channelToken, id) });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete address' }, { status: 400 });
    }
}
