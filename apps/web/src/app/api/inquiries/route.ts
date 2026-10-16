import { NextResponse } from 'next/server';

import { createMarketplaceListingInquiry } from '@/features/chat/services/marketplace-chat.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Sign in as a customer to contact this vendor' }, { status: 401 });
    }
    try {
        const body = await request.json() as Record<string, unknown>;
        const budget = Number(body.budget ?? 0);
        const inquiry = await createMarketplaceListingInquiry({
            productId: String(body.productId ?? ''),
            inquiryType: String(body.inquiryType ?? 'EVENT'),
            eventType: String(body.eventType ?? ''),
            eventDate: String(body.eventDate ?? ''),
            startTime: String(body.startTime ?? '') || undefined,
            endTime: String(body.endTime ?? '') || undefined,
            guestCount: Number(body.guestCount ?? 0),
            city: String(body.city ?? ''),
            venue: String(body.venue ?? '') || undefined,
            budget: Number.isFinite(budget) && budget > 0 ? Math.round(budget * 100) : undefined,
            theme: String(body.theme ?? '') || undefined,
            projectTitle: String(body.projectTitle ?? '') || undefined,
            projectType: String(body.projectType ?? '') || undefined,
            deadline: String(body.deadline ?? '') || undefined,
            brandName: String(body.brandName ?? '') || undefined,
            targetAudience: String(body.targetAudience ?? '') || undefined,
            projectGoal: String(body.projectGoal ?? '') || undefined,
            conceptCount: Number(body.conceptCount ?? 0) || undefined,
            conceptNotes: String(body.conceptNotes ?? '') || undefined,
            colorTheme: String(body.colorTheme ?? '') || undefined,
            stylePreferences: String(body.stylePreferences ?? '') || undefined,
            dimensions: String(body.dimensions ?? '') || undefined,
            fileFormats: Array.isArray(body.fileFormats) ? body.fileFormats.map(String) : undefined,
            contentStatus: String(body.contentStatus ?? '') || undefined,
            usageType: String(body.usageType ?? '') || undefined,
            revisionRounds: Number.isInteger(Number(body.revisionRounds)) ? Number(body.revisionRounds) : undefined,
            referenceLinks: Array.isArray(body.referenceLinks) ? body.referenceLinks.map(String) : undefined,
            ndaRequired: body.ndaRequired === true,
            className: String(body.className ?? '') || undefined,
            desiredStartDate: String(body.desiredStartDate ?? '') || undefined,
            details: String(body.details ?? ''),
        }, authToken, session.channelToken);
        return NextResponse.json(inquiry, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to send this inquiry' }, { status: 400 });
    }
}
