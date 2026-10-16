import { ApplicationRole } from '@marketplace/contracts';
import { NextRequest, NextResponse } from 'next/server';

import {
    RoleApplicationInput,
    submitRoleApplication,
    trackRoleApplication,
} from '@/features/applications/services/application-api';

const roles = new Set<ApplicationRole>(['VENDOR', 'INFLUENCER', 'ORGANIZER']);

function requiredString(input: Record<string, unknown>, field: string) {
    const value = input[field];
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${field} is required`);
    }
    return value.trim();
}

function optionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim())
        : undefined;
}

export async function POST(request: NextRequest) {
    const input = (await request.json()) as Record<string, unknown> & { role?: ApplicationRole };
    if (!input.role || !roles.has(input.role)) {
        return NextResponse.json({ message: 'Choose a valid application role' }, { status: 400 });
    }
    try {
        const applicationInput: RoleApplicationInput = {
            role: input.role,
            displayName: requiredString(input, 'displayName'),
            firstName: requiredString(input, 'firstName'),
            lastName: requiredString(input, 'lastName'),
            emailAddress: requiredString(input, 'emailAddress').toLowerCase(),
            phoneNumber: optionalString(input.phoneNumber),
            businessType: optionalString(input.businessType),
            websiteUrl: optionalString(input.websiteUrl),
            description: requiredString(input, 'description'),
            categories: stringArray(input.categories),
            operatingLocations: stringArray(input.operatingLocations),
            profileData: input.profileData && typeof input.profileData === 'object' && !Array.isArray(input.profileData)
                ? input.profileData as Record<string, unknown>
                : undefined,
        };
        const application = await submitRoleApplication(applicationInput);
        return NextResponse.json(application, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Application could not be submitted' },
            { status: 400 },
        );
    }
}

export async function GET(request: NextRequest) {
    const reference = request.nextUrl.searchParams.get('reference');
    const emailAddress = request.nextUrl.searchParams.get('emailAddress');
    if (!reference || !emailAddress) {
        return NextResponse.json({ message: 'Application reference and email are required' }, { status: 400 });
    }
    try {
        const application = await trackRoleApplication(reference, emailAddress);
        if (!application) {
            return NextResponse.json({ message: 'No matching application was found' }, { status: 404 });
        }
        return NextResponse.json(application);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Status could not be loaded' },
            { status: 400 },
        );
    }
}
