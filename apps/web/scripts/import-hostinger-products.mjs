import { chromium } from 'playwright';

const sourceBaseUrl = process.env.SOURCE_BASE_URL ?? 'https://gold-dotterel-991915.hostingersite.com';
const targetBaseUrl = process.env.TARGET_BASE_URL ?? 'http://localhost:3001';
const identifier = process.env.VENDOR_EMAIL;
const password = process.env.VENDOR_PASSWORD;
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!identifier || !password) {
    throw new Error('Set VENDOR_EMAIL and VENDOR_PASSWORD before running this importer.');
}

const products = [
    {
        slug: 'hand-painted-ceramic-tray',
        name: 'Hand-Painted Ceramic Tray',
        maker: 'Noor Studio',
        price: 3500,
        oldPrice: 4000,
        image: '/assets/prod-tray-DZQ9RVmx.jpg',
        categoryCode: 'home-and-living/kitchen-and-dining/dinnerware',
        category: 'Ceramics',
        badge: 'Bestseller',
        description: 'A hand-painted stoneware tray made slowly in small batches.',
        attributes: { materials: ['Stoneware ceramic'], color: ['Cream', 'Speckled'], care_instructions: 'Hand wash gently and dry completely.' },
    },
    {
        slug: 'speckled-breakfast-bowl',
        name: 'Speckled Breakfast Bowl',
        maker: 'Noor Studio',
        price: 2200,
        image: '/assets/tile-home-yn3OdPBf.jpg',
        categoryCode: 'home-and-living/kitchen-and-dining/dinnerware',
        category: 'Ceramics',
        badge: 'Handmade',
        description: 'A warm, everyday bowl with a soft speckled glaze.',
        attributes: { materials: ['Stoneware ceramic'], color: ['Natural', 'Speckled'], care_instructions: 'Hand wash gently and dry completely.' },
    },
    {
        slug: 'clay-vessel-candle',
        name: 'Clay Vessel Soy Candle',
        maker: 'Noor Studio',
        price: 2800,
        image: '/assets/prod-candle-COBAqT1R.jpg',
        categoryCode: 'home-and-living/home-decor/candles',
        category: 'Home Fragrance',
        badge: 'New',
        description: 'Hand-poured soy wax in a reusable clay vessel.',
        attributes: { materials: ['Soy wax', 'Clay'], color: ['Terracotta'], safety_information: 'Never leave a burning candle unattended.' },
    },
    {
        slug: 'block-printed-cotton-scarf',
        name: 'Block-Printed Cotton Scarf',
        maker: 'Chapa Textiles',
        price: 4200,
        image: '/assets/prod-scarf-BdCH1JN5.jpg',
        categoryCode: 'jewelry-and-accessories/scarves-and-wraps',
        category: 'Textiles',
        badge: 'Small batch',
        description: 'Hand-block printed cotton made by craftspeople in Multan.',
        attributes: { materials: ['Cotton'], color: ['Blue', 'Indigo'], size: ['One size'], care_instructions: 'Cold hand wash separately and line dry in shade.' },
    },
    {
        slug: 'indigo-market-tote',
        name: 'Indigo Market Tote',
        maker: 'Chapa Textiles',
        price: 3600,
        image: '/assets/prod-tote-DQYnTFGZ.jpg',
        categoryCode: 'bags-and-purses/tote-bags',
        category: 'Bags',
        description: 'A roomy cotton tote finished with hand-printed indigo motifs.',
        attributes: { materials: ['Cotton canvas', 'Leather'], color: ['Natural', 'Indigo'], size: ['Large'], care_instructions: 'Spot clean only.' },
    },
    {
        slug: 'hand-blocked-table-runner',
        name: 'Hand-Blocked Table Runner',
        maker: 'Chapa Textiles',
        price: 4950,
        image: '/assets/tile-handmade-DOWTnBvn.jpg',
        categoryCode: 'home-and-living/kitchen-and-dining/kitchen-accessories',
        category: 'Home Textiles',
        description: 'A quietly detailed runner printed using carved sheesham blocks.',
        attributes: { materials: ['Cotton'], color: ['Natural', 'Indigo'], size: ['Standard table runner'], care_instructions: 'Cold hand wash separately and iron on reverse.' },
    },
    {
        slug: 'brass-enamel-earrings',
        name: 'Brass Enamel Earrings',
        maker: 'Meher Jewels',
        price: 3900,
        image: '/assets/prod-earrings-7LBiz3xB.jpg',
        categoryCode: 'jewelry-and-accessories/earrings',
        category: 'Jewelry',
        badge: 'Bestseller',
        description: 'Lightweight brass earrings finished with jewel-toned enamel.',
        attributes: { materials: ['Brass', 'Enamel'], color: ['Brass', 'Blue'], jewelry_type: 'Drop earrings', metal_material: ['Brass'], personalization: false },
    },
    {
        slug: 'hammered-brass-hoops',
        name: 'Hammered Brass Hoops',
        maker: 'Meher Jewels',
        price: 3200,
        image: '/assets/tile-beautiful-DPQys6eb.jpg',
        categoryCode: 'jewelry-and-accessories/earrings',
        category: 'Jewelry',
        description: 'Everyday hoops hammered and polished by hand in Karachi.',
        attributes: { materials: ['Brass'], color: ['Brass'], jewelry_type: 'Hoop earrings', metal_material: ['Brass'], personalization: false },
    },
    {
        slug: 'keepsake-charm-necklace',
        name: 'Keepsake Charm Necklace',
        maker: 'Meher Jewels',
        price: 5800,
        image: '/assets/journal-3-Bwuqcyfx.jpg',
        categoryCode: 'jewelry-and-accessories/necklaces',
        category: 'Jewelry',
        badge: 'Personalise it',
        description: 'A delicate charm necklace that can be engraved with one initial.',
        attributes: { materials: ['Brass'], color: ['Gold'], chain_length: '45 cm', jewelry_type: 'Charm necklace', metal_material: ['Brass'], personalization: true },
    },
    {
        slug: 'wildflower-soap-set',
        name: 'Wildflower Soap Set',
        maker: 'Wild Root',
        price: 1950,
        image: '/assets/prod-soap-DJy5styG.jpg',
        categoryCode: 'beauty-and-personal-care/beauty-gift-sets',
        category: 'Bath & Body',
        badge: 'Natural',
        description: 'Three cold-pressed botanical soaps wrapped for gifting.',
        attributes: { materials: ['Plant oils', 'Botanical extracts'], beauty_ingredients: 'Cold-pressed plant oils, dried botanicals and essential oils.', usage_instructions: 'Lather with water, rinse well and keep dry between uses.', net_volume_weight: '3 bars' },
    },
    {
        slug: 'slow-morning-gift-box',
        name: 'Slow Morning Gift Box',
        maker: 'Wild Root',
        price: 4650,
        image: '/assets/food-hamper-Duz6PJ9Z.jpg',
        categoryCode: 'gifts-and-hampers/gift-boxes',
        category: 'Gifts',
        description: 'A restful edit of bath, tea and small-batch self-care essentials.',
        attributes: { materials: ['Botanical self-care products', 'Tea', 'Gift packaging'], packaging_details: 'Packed in a reusable gift box with protective paper fill.' },
    },
    {
        slug: 'botanical-body-oil',
        name: 'Botanical Body Oil',
        maker: 'Wild Root',
        price: 2400,
        image: '/assets/workshop-flowers-CcnZfwVj.jpg',
        categoryCode: 'beauty-and-personal-care/bath-and-body',
        category: 'Body Care',
        description: 'A light botanical blend for an unhurried everyday ritual.',
        attributes: { materials: ['Botanical oils'], beauty_ingredients: 'A lightweight blend of botanical carrier oils and natural fragrance.', usage_instructions: 'Massage a small amount into clean, damp skin.', net_volume_weight: '100 ml', warnings: 'For external use only. Patch test before use.' },
    },
    {
        slug: 'mini-clay-ring-dish',
        name: 'Mini Clay Ring Dish',
        maker: 'Noor Studio',
        price: 850,
        image: '/assets/prod-tray-DZQ9RVmx.jpg',
        categoryCode: 'jewelry-and-accessories/jewelry-storage',
        category: 'Ceramics',
        badge: 'Under 1,000',
        description: 'A tiny hand-shaped dish for rings, pins and everyday keepsakes.',
        attributes: { materials: ['Stoneware ceramic'], color: ['Cream', 'Speckled'], dimensions: '9 x 9 x 2', dimension_unit: 'cm', care_instructions: 'Wipe clean with a soft damp cloth.' },
    },
    {
        slug: 'botanical-soap-bar',
        name: 'Botanical Soap Bar',
        maker: 'Wild Root',
        price: 650,
        image: '/assets/prod-soap-DJy5styG.jpg',
        categoryCode: 'beauty-and-personal-care/soaps',
        category: 'Bath & Body',
        badge: 'Under 1,000',
        description: 'A cold-pressed botanical bar wrapped by hand for simple gifting.',
        attributes: { materials: ['Plant oils', 'Botanical extracts'], beauty_ingredients: 'Cold-pressed plant oils, dried botanicals and essential oils.', usage_instructions: 'Lather with water, rinse well and keep dry between uses.', net_volume_weight: '110 g' },
    },
    {
        slug: 'handprinted-gift-tags',
        name: 'Handprinted Gift Tag Set',
        maker: 'Chapa Textiles',
        price: 550,
        image: '/assets/tile-handmade-DOWTnBvn.jpg',
        categoryCode: 'books-stationery-and-party-supplies/gifting-stationery',
        category: 'Gifts',
        badge: 'Under 1,000',
        description: 'Six small handprinted tags made to finish a thoughtful gift.',
        attributes: { materials: ['Recycled paper', 'Cotton string'], color: ['Natural', 'Indigo'], packaging_details: 'Set of six tags in a protective paper sleeve.' },
    },
    {
        slug: 'digital-celebration-card',
        name: 'Digital Celebration Card',
        maker: 'Meher Jewels',
        price: 450,
        image: '/assets/journal-3-Bwuqcyfx.jpg',
        categoryCode: 'digital-products/invitations',
        category: 'Digital',
        badge: 'Instant download',
        description: 'A printable celebration card designed by a local independent creative.',
        digital: true,
        attributes: {
            file_type: 'JPG',
            number_of_files: 1,
            number_of_pages: 1,
            included: ['One high-resolution printable celebration card'],
            compatibility: ['Any device that opens JPG images'],
            language: 'English',
            software_required: 'No special software required',
            version: '1.0',
            commercial_use: false,
            editable: false,
            license_type: 'Personal',
            users_allowed: 1,
            personal_use: true,
            printable: true,
            automatic_delivery: true,
            customer_account_required: true,
            download_expiry: 30,
            download_limit: 5,
            personalized_download: false,
            watermark: false,
            copyright_information: 'Personal-use license. Redistribution or resale is not permitted.',
            rights_confirmed: true,
            licensed_assets: false,
        },
    },
];

function skuFor(slug) {
    return `TMB-${slug.replace(/[^a-z0-9]+/gi, '-').toUpperCase()}`.slice(0, 48);
}

function fileNameFromUrl(url) {
    return new URL(url).pathname.split('/').pop() || 'product-image.jpg';
}

async function json(response, label) {
    const text = await response.text();
    let value;
    try {
        value = text ? JSON.parse(text) : undefined;
    } catch {
        throw new Error(`${label} returned invalid JSON (${response.status()}): ${text.slice(0, 300)}`);
    }
    if (!response.ok()) {
        throw new Error(`${label} failed (${response.status()}): ${value?.message ?? text.slice(0, 300)}`);
    }
    return value;
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function mutation(factory, label) {
    let lastError;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
        try {
            const result = await json(await factory(), label);
            await delay(650);
            return result;
        } catch (error) {
            lastError = error;
            if (!String(error).toLowerCase().includes('database is locked') || attempt === 6) throw error;
            await delay(700 * attempt);
        }
    }
    throw lastError;
}

async function downloadImage(relativeUrl) {
    const url = new URL(relativeUrl, sourceBaseUrl).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
    const contentType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    return {
        name: fileNameFromUrl(url),
        mimeType: contentType,
        buffer: Buffer.from(await response.arrayBuffer()),
    };
}

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const context = await browser.newContext();
const request = context.request;

try {
    await mutation(() => request.post(`${targetBaseUrl}/api/auth/login`, {
        data: { identifier, password },
    }), 'Vendor sign-in');

    const [catalog, categories, shipping] = await Promise.all([
        json(await request.get(`${targetBaseUrl}/api/vendor/catalog`), 'Current catalogue'),
        json(await request.get(`${targetBaseUrl}/api/vendor/catalog/categories`), 'Categories'),
        json(await request.get(`${targetBaseUrl}/api/vendor/shipping`), 'Shipping profiles'),
    ]);

    const categoryByCode = new Map(categories.map(category => [category.code, category]));
    const shippingProfileId = shipping.defaultProfileId
        ?? shipping.deliveryProfiles?.find(profile => profile.enabled)?.id;
    if (!shippingProfileId) throw new Error('The vendor has no enabled delivery profile.');

    const currentByName = new Map(catalog.items.map(product => [product.name.toLowerCase(), product]));
    const imageByUrl = new Map();
    const summary = { created: [], published: [], skipped: [], failed: [] };

    for (const product of products) {
        try {
            const existing = currentByName.get(product.name.toLowerCase());
            if (existing) {
                if (existing.status !== 'PUBLISHED') {
                    await mutation(
                        () => request.post(`${targetBaseUrl}/api/vendor/catalog/${existing.id}/publish`),
                        `Publish ${product.name}`,
                    );
                    summary.published.push(product.name);
                } else {
                    summary.skipped.push(product.name);
                }
                continue;
            }

            const category = categoryByCode.get(product.categoryCode);
            if (!category) throw new Error(`Category not found: ${product.categoryCode}`);

            let asset = imageByUrl.get(product.image);
            const sourceImage = asset ? undefined : await downloadImage(product.image);
            if (!asset && sourceImage) {
                const uploaded = await mutation(() => request.post(`${targetBaseUrl}/api/vendor/catalog/assets`, {
                    multipart: {
                        files: {
                            name: sourceImage.name,
                            mimeType: sourceImage.mimeType,
                            buffer: sourceImage.buffer,
                        },
                    },
                }), `Upload image for ${product.name}`);
                asset = uploaded[0];
                imageByUrl.set(product.image, asset);
            }

            let digitalFiles = [];
            if (product.digital) {
                const digitalSource = sourceImage ?? await downloadImage(product.image);
                const digitalFile = await mutation(() => request.post(`${targetBaseUrl}/api/vendor/catalog/files`, {
                    multipart: {
                        file: {
                            name: `${product.slug}.jpg`,
                            mimeType: 'image/jpeg',
                            buffer: digitalSource.buffer,
                        },
                    },
                }), `Upload digital file for ${product.name}`);
                digitalFiles = [{
                    kind: 'MAIN',
                    fileName: digitalFile.fileName,
                    storageKey: digitalFile.storageKey,
                    mimeType: digitalFile.mimeType,
                    sizeBytes: digitalFile.sizeBytes,
                    checksum: digitalFile.checksum,
                    isPrivate: true,
                    downloadLimit: 5,
                    metadata: {
                        automaticDelivery: true,
                        downloadExpiryDays: 30,
                        customerAccountRequired: true,
                        watermark: false,
                        personalizedDownload: false,
                    },
                }];
                product.attributes.file_size = `${Math.max(1, Math.round(digitalFile.sizeBytes / 1024))} KB`;
            }

            const physicalDefaults = product.digital ? {} : {
                condition: 'New',
                stock_status: 'In Stock',
                packaging_details: 'Packed securely using protective, gift-ready materials.',
                warranty_information: 'Please contact the maker promptly if the item arrives damaged.',
            };
            const payload = {
                name: product.name,
                slug: product.slug,
                description: product.description,
                categoryId: category.id,
                categoryCode: category.code,
                brand: product.maker,
                tags: [product.category, product.maker, product.badge].filter(Boolean),
                attributes: { ...physicalDefaults, ...product.attributes },
                deliveryInformation: product.digital
                    ? 'Available automatically from the customer account after successful payment.'
                    : 'Usually dispatched within 1–2 working days. Delivery timing and charges are calculated at checkout.',
                shippingProfileId: product.digital ? undefined : shippingProfileId,
                returnPolicy: product.digital
                    ? 'Digital purchases cannot be returned after the file has been downloaded.'
                    : 'Returns are accepted within 7 days when the item is unused and in its original packaging.',
                disclaimer: product.digital
                    ? 'Colours can vary between screens and printed output. This purchase is for personal use only.'
                    : 'Handmade details, colour and scale can vary slightly from the photographs.',
                seoTitle: `${product.name} | The Makers Bazar`,
                seoDescription: product.description,
                assetIds: [asset.id],
                featuredAssetId: asset.id,
                optionGroups: [],
                variants: [{
                    sku: skuFor(product.slug),
                    price: Math.round(product.price * 100),
                    compareAtPrice: product.oldPrice ? Math.round(product.oldPrice * 100) : undefined,
                    stockOnHand: product.digital ? 0 : 24,
                    optionValues: {},
                    lowStockThreshold: 5,
                    allowBackorders: false,
                    backorderLimit: 0,
                    maxOrderQuantity: product.digital ? 0 : 6,
                }],
                servicePackages: [],
                serviceAddOns: [],
                availabilitySessions: [],
                eventTicketTypes: [],
                eventScheduleItems: [],
                digitalFiles,
            };

            const created = await mutation(
                () => request.post(`${targetBaseUrl}/api/vendor/catalog`, { data: payload }),
                `Create ${product.name}`,
            );
            summary.created.push(product.name);
            currentByName.set(product.name.toLowerCase(), created);

            await mutation(
                () => request.post(`${targetBaseUrl}/api/vendor/catalog/${created.id}/publish`),
                `Publish ${product.name}`,
            );
            summary.published.push(product.name);
            console.log(`Published: ${product.name}`);
        } catch (error) {
            summary.failed.push({ name: product.name, error: error instanceof Error ? error.message : String(error) });
            console.error(`Failed: ${product.name}: ${summary.failed.at(-1).error}`);
        }
    }

    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed.length) process.exitCode = 1;
} finally {
    await browser.close();
}
