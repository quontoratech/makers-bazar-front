import { NextRequest, NextResponse } from 'next/server';

import { publicShopRequest } from '@/lib/api/public-shop-request';

const mutation = `
    mutation ResetPassword($token: String!, $password: String!) {
        resetPassword(token: $token, password: $password) {
            ... on CurrentUser { id identifier }
            ... on ErrorResult { errorCode message }
        }
    }
`;

export async function POST(request: NextRequest) {
    const input = (await request.json()) as { token?: string; password?: string };
    if (!input.token || !input.password || input.password.length < 12) {
        return NextResponse.json({ message: 'A valid reset link and password of at least 12 characters are required' }, { status: 400 });
    }
    try {
        const data = await publicShopRequest<{
            resetPassword: { id?: string; errorCode?: string; message?: string };
        }>(mutation, input);
        if (!data.resetPassword.id) throw new Error(data.resetPassword.message ?? 'Password reset failed');
        return NextResponse.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Password reset failed' }, { status: 400 });
    }
}
