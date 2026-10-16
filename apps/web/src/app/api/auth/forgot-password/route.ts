import { NextRequest, NextResponse } from 'next/server';

import { publicShopRequest } from '@/lib/api/public-shop-request';

const mutation = `
    mutation RequestPasswordReset($emailAddress: String!) {
        requestPasswordReset(emailAddress: $emailAddress) {
            ... on Success { success }
            ... on ErrorResult { errorCode message }
        }
    }
`;

export async function POST(request: NextRequest) {
    const { emailAddress } = (await request.json()) as { emailAddress?: string };
    if (!emailAddress) return NextResponse.json({ message: 'Email address is required' }, { status: 400 });
    try {
        await publicShopRequest(mutation, { emailAddress: emailAddress.trim().toLowerCase() });
        return NextResponse.json({ success: true, message: 'If the account exists, a reset email has been sent.' });
    } catch {
        return NextResponse.json({ success: true, message: 'If the account exists, a reset email has been sent.' });
    }
}
