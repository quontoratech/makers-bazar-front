import { NextResponse } from 'next/server';

import { getMarketplaceSession } from '@/lib/auth/server-session';

export async function GET() {
    const session = await getMarketplaceSession();
    return NextResponse.json({ session });
}
