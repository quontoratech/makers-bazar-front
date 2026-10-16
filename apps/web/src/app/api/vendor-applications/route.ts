import { NextRequest, NextResponse } from 'next/server';

import { submitRoleApplication } from '@/features/applications/services/application-api';

const requiredFields = ['shopName', 'ownerFirstName', 'ownerLastName', 'ownerEmailAddress', 'businessType'];

export async function POST(request: NextRequest) {
    const input = (await request.json()) as Record<string, unknown>;
    const missing = requiredFields.filter(field => typeof input[field] !== 'string' || !String(input[field]).trim());
    if (missing.length) {
        return NextResponse.json({ message: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    try {
        const result = await submitRoleApplication({
            role: 'VENDOR',
            displayName: String(input.shopName),
            firstName: String(input.ownerFirstName),
            lastName: String(input.ownerLastName),
            emailAddress: String(input.ownerEmailAddress),
            phoneNumber: input.phoneNumber ? String(input.phoneNumber) : undefined,
            businessType: String(input.businessType),
            description: String(input.description ?? ''),
            categories: Array.isArray(input.categories) ? input.categories.map(String) : [],
            operatingLocations: Array.isArray(input.operatingLocations)
                ? input.operatingLocations.map(String)
                : [],
        });
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Vendor application service unavailable' },
            { status: 502 },
        );
    }
}
