import { promotionGet, promotionPost } from '@/features/promotions/services/promotion-api.server';

export function GET() { return promotionGet(true); }
export function POST(request: Request) { return promotionPost(request, true); }
