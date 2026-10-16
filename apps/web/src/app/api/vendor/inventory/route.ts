import { NextResponse } from 'next/server';

import { InventoryUpdateInput } from '@/features/vendor-catalog/types';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { getVendorInventory, updateVendorInventory } from '@/features/vendor-inventory/services/vendor-inventory.server';

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        return NextResponse.json(await getVendorInventory(auth.token, auth.session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load inventory' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const body = await request.json() as { input?: InventoryUpdateInput[] };
        return NextResponse.json(await updateVendorInventory(auth.token, auth.session.channelToken, body.input ?? []));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update inventory' }, { status: 400 });
    }
}
