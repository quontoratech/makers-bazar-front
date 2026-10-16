import { NextRequest, NextResponse } from 'next/server';

import { publicShopRequest } from '@/lib/api/public-shop-request';
import { PENDING_EMAIL_COOKIE } from '@/lib/auth/session';

const mutation = `
    mutation RegisterCustomer($input: RegisterMarketplaceCustomerInput!) {
        requestMarketplaceCustomerRegistration(input: $input) {
            success
            message
            expiresAt
            maskedEmail
        }
    }
`;

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Record<string, unknown>;
        const input = {
            firstName: typeof body.firstName === 'string' ? body.firstName.trim().replace(/\s+/g, ' ') : '',
            lastName: typeof body.lastName === 'string' ? body.lastName.trim().replace(/\s+/g, ' ') : '',
            emailAddress: typeof body.emailAddress === 'string' ? body.emailAddress.trim().toLowerCase() : '',
            phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '',
            password: typeof body.password === 'string' ? body.password : '',
            termsAccepted: body.termsAccepted === true,
            privacyAccepted: body.privacyAccepted === true,
            marketingConsent: body.marketingConsent === true,
        };
        if (!input.firstName || !input.lastName || input.firstName.length > 250 || input.lastName.length > 250) {
            return NextResponse.json({ message: 'Enter your first and last name' }, { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailAddress)) {
            return NextResponse.json({ message: 'Enter a valid email address' }, { status: 400 });
        }
        const normalizedPhone = input.phoneNumber.replace(/[ ()-]/g, '');
        if (normalizedPhone && !/^\+?\d{7,15}$/.test(normalizedPhone)) {
            return NextResponse.json({ message: 'Enter a valid mobile number' }, { status: 400 });
        }
        if (input.password.length < 12 || input.password.length > 256) {
            return NextResponse.json({ message: 'Use a password between 12 and 256 characters' }, { status: 400 });
        }
        if (!input.termsAccepted || !input.privacyAccepted) {
            return NextResponse.json({ message: 'Accept the customer terms and privacy policy to create an account' }, { status: 400 });
        }
        const data = await publicShopRequest<{
            requestMarketplaceCustomerRegistration: {
                success: boolean;
                message: string;
                expiresAt: string;
                maskedEmail: string;
            };
        }>(mutation, { input });
        const registration = data.requestMarketplaceCustomerRegistration;
        if (!registration.success) {
            return NextResponse.json(registration, { status: 400 });
        }
        const response = NextResponse.json(registration, { status: 201 });
        response.cookies.set(
            PENDING_EMAIL_COOKIE,
            String(input.emailAddress ?? '')
                .trim()
                .toLowerCase(),
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 30,
            },
        );
        return response;
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Registration failed' },
            { status: 400 },
        );
    }
}
