import { NextRequest, NextResponse } from 'next/server';

import { searchCatalog } from '@/features/catalog/services/catalog.service';

export async function GET(request: NextRequest) {
    const term = request.nextUrl.searchParams.get('q') ?? '';
    try {
        const data = await searchCatalog(term);
        return NextResponse.json(data.search);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Catalog service unavailable' },
            { status: 502 },
        );
    }
}
