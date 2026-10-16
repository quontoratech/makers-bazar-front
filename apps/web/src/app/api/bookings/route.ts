import { NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { getMarketplaceBookings } from '@/features/bookings/services/marketplace-bookings.server';

const createBookingMutation = `
    mutation CreateStorefrontBooking($input: CreateMarketplaceBookingInput!) {
        createMarketplaceBooking(input: $input) {
            id
            status
            title
            startsAt
            endsAt
            quantity
        }
    }
`;

const bookingFields = `id details createdAt updatedAt customerId vendorProfileId orderId productVariantId availabilitySessionId eventTicketTypeId bookingType title startsAt endsAt quantity capacity status billingModel paidAt renewalReminderSentAt paymentStatus agreedPrice subscriptionClassName graceEndsAt renewalToken cancellationRequestedAt cancelledAt customerName customerEmail customerNote internalNote secureAccessReference`;
const vendorStatusMutation = `mutation UpdateBookingStatus($input: UpdateMarketplaceBookingStatusInput!) { updateMarketplaceBookingStatus(input: $input) { ${bookingFields} } }`;
const customerCancelMutation = `mutation CancelSubscription($id: ID!, $reason: String) { requestMarketplaceSubscriptionCancellation(id: $id, reason: $reason) { ${bookingFields} } }`;

interface BookingRequest {
    vendorProfileId?: string;
    productVariantId?: string;
    availabilitySessionId?: string;
    eventTicketTypeId?: string;
    bookingType?: string;
    purchaseMode?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    quantity?: number;
}

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || !['customer', 'vendor'].includes(session.role)) {
        return NextResponse.json({ message: 'Sign in to view bookings' }, { status: 401 });
    }
    try {
        return NextResponse.json(await getMarketplaceBookings(session.role as 'customer' | 'vendor', authToken, session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load bookings' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || !['customer', 'vendor'].includes(session.role)) {
        return NextResponse.json({ message: 'Sign in to update bookings' }, { status: 401 });
    }
    try {
        const body = await request.json() as { id?: string; action?: string; reason?: string; status?: string; internalNote?: string; secureAccessReference?: string };
        if (!body.id) throw new Error('A booking id is required');
        if (session.role === 'customer') {
            if (body.action !== 'cancel') throw new Error('Customers can request subscription cancellation only');
            const data = await authenticatedVendureRequest<{ requestMarketplaceSubscriptionCancellation: unknown }>('shop', authToken, customerCancelMutation, { id: body.id, reason: body.reason }, session.channelToken);
            return NextResponse.json(data.requestMarketplaceSubscriptionCancellation);
        }
        const data = await authenticatedVendureRequest<{ updateMarketplaceBookingStatus: unknown }>('admin', authToken, vendorStatusMutation, {
            input: { id: body.id, status: String(body.status ?? ''), internalNote: body.internalNote, secureAccessReference: body.secureAccessReference },
        }, session.channelToken);
        return NextResponse.json(data.updateMarketplaceBookingStatus);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update booking' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Sign in with a customer account to request a booking' }, { status: 401 });
    }

    try {
        const input = await request.json() as BookingRequest;
        const bookingType = String(input.bookingType ?? '').toUpperCase();
        const startsAt = new Date(String(input.startsAt ?? ''));
        const endsAt = new Date(String(input.endsAt ?? ''));
        const quantity = Number(input.quantity ?? 1);
        if (!['SERVICE', 'WORKSHOP', 'EXPERIENCE', 'TICKET'].includes(bookingType)) {
            throw new Error('Choose a supported booking type');
        }
        if (!input.vendorProfileId || !input.productVariantId || !input.title?.trim()) {
            throw new Error('The selected listing is missing required booking details');
        }
        if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
            throw new Error('Choose a valid booking time');
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            throw new Error('Booking quantity must be between 1 and 100');
        }

        const data = await authenticatedVendureRequest<{
            createMarketplaceBooking: {
                id: string;
                status: string;
                title: string;
                startsAt: string;
                endsAt: string;
                quantity: number;
            };
        }>('shop', authToken, createBookingMutation, {
            input: {
                vendorProfileId: String(input.vendorProfileId),
                productVariantId: String(input.productVariantId),
                availabilitySessionId: input.availabilitySessionId ? String(input.availabilitySessionId) : undefined,
                eventTicketTypeId: input.eventTicketTypeId ? String(input.eventTicketTypeId) : undefined,
                bookingType,
                purchaseMode: input.purchaseMode ? String(input.purchaseMode).toUpperCase() : undefined,
                title: input.title.trim().slice(0, 180),
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                quantity,
            },
        }, session.channelToken);
        return NextResponse.json(data.createMarketplaceBooking, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to request this booking' }, { status: 400 });
    }
}
