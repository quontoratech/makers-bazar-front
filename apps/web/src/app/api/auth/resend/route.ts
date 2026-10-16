import { NextRequest, NextResponse } from 'next/server';

import { publicShopRequest } from '@/lib/api/public-shop-request';
import { PENDING_EMAIL_COOKIE } from '@/lib/auth/session';

const mutation = `
    mutation ResendCustomerOtp($emailAddress: String!) {
        resendMarketplaceCustomerOtp(emailAddress: $emailAddress) {
            success
            message
            expiresAt
            maskedEmail
        }
    }
`;

export async function POST(request: NextRequest) {
    const emailAddress = request.cookies.get(PENDING_EMAIL_COOKIE)?.value;
    if (!emailAddress) {
        return NextResponse.json({ message: 'Start customer registration again' }, { status: 400 });
    }
    try {
        const data = await publicShopRequest<{
            resendMarketplaceCustomerOtp: { success: boolean; message: string; expiresAt: string; maskedEmail: string };
        }>(mutation, { emailAddress });
        return NextResponse.json(data.resendMarketplaceCustomerOtp);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to resend code' },
            { status: 400 },
        );
    }
}
