import { NextRequest, NextResponse } from 'next/server';

import { createCustomerAddress } from '@/features/customer/services/customer-account.server';
import { CustomerAddressInput } from '@/features/customer/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function POST(request: NextRequest) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || session.role !== 'customer' || !authToken) {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    }
    const input = await request.json() as CustomerAddressInput;
    if (!input.streetLine1?.trim() || !input.city?.trim() || !input.countryCode?.trim()) {
        return NextResponse.json({ message: 'Street address, city, and country are required' }, { status: 400 });
    }
    try {
        return NextResponse.json(await createCustomerAddress(authToken, session.channelToken, input), { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to add address' }, { status: 400 });
    }
}
