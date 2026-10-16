export const siteConfig = {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'The Makers Bazar',
    description: 'Original things, real stories and independent makers from across Pakistan.',
    shopApiUrl:
        process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL ?? 'http://localhost:3000/shop-api',
    adminApiUrl:
        process.env.NEXT_PUBLIC_VENDURE_ADMIN_API_URL ?? 'http://localhost:3000/admin-api',
    channelToken: process.env.NEXT_PUBLIC_DEFAULT_CHANNEL_TOKEN ?? '',
};
