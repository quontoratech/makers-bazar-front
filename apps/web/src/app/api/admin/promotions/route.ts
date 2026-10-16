import { promotionGet, promotionPost } from '@/features/promotions/services/promotion-api.server';

export function GET() { return promotionGet(false); }
export function POST(request: Request) { return promotionPost(request, false); }
