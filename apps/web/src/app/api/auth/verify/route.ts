import { NextRequest, NextResponse } from 'next/server';

import { publicShopRequest } from '@/lib/api/public-shop-request';
import { PENDING_EMAIL_COOKIE } from '@/lib/auth/session';

const mutation = `
    mutation VerifyCustomerOtp($input: VerifyMarketplaceCustomerOtpInput!) {
        verifyMarketplaceCustomerOtp(input: $input) { success message }
    }
`;

export async function POST(request: NextRequest) {
    const emailAddress = request.cookies.get(PENDING_EMAIL_COOKIE)?.value;
    try {
        const { code } = (await request.json()) as { code?: string };
        if (!emailAddress || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
            return NextResponse.json({ message: 'Enter the six-digit verification code' }, { status: 400 });
        }
        const data = await publicShopRequest<{
            verifyMarketplaceCustomerOtp: { success: boolean; message: string };
        }>(mutation, { input: { emailAddress, code } });
        const response = NextResponse.json(data.verifyMarketplaceCustomerOtp);
        response.cookies.delete(PENDING_EMAIL_COOKIE);
        return response;
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Verification failed' },
            { status: 400 },
        );
    }
}
