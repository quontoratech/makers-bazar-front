import { NextRequest, NextResponse } from 'next/server';

import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { VendorAvailabilitySettings } from '@/features/vendor-availability/types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const fields = `
    id shopName availabilityPaused availabilityPauseReason availabilityTimezone
    weeklyHours { dayOfWeek enabled opensAt closesAt }
    unavailableDates { id date reason }
    holidayModeEnabled holidayStartsAt holidayEndsAt holidayReason
    availability {
        status isOpen acceptsPerishableOrders label reason timezone currentDate todayHours
        weeklyHours { dayOfWeek enabled opensAt closesAt }
    }
`;

const query = `
    query MyVendorAvailability {
        myMarketplaceVendorProfile { ${fields} }
    }
`;

const mutation = `
    mutation UpdateMyVendorAvailability($input: UpdateMyMarketplaceVendorStorefrontInput!) {
        updateMyMarketplaceVendorStorefront(input: $input) { ${fields} }
    }
`;

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const result = await authenticatedVendureRequest<{ myMarketplaceVendorProfile: VendorAvailabilitySettings }>(
            'admin', auth.token, query, undefined, auth.session.channelToken,
        );
        return NextResponse.json(result.myMarketplaceVendorProfile);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load shop availability' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const input = await request.json() as Record<string, unknown>;
        const result = await authenticatedVendureRequest<{ updateMyMarketplaceVendorStorefront: VendorAvailabilitySettings }>(
            'admin', auth.token, mutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(result.updateMyMarketplaceVendorStorefront);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save shop availability' }, { status: 400 });
    }
}
