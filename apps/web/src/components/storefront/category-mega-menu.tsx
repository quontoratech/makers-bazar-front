'use client';

import { ArrowRight, ChevronRight, Grid3X3 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { MarketplaceCategoryMenuNode } from '@/features/catalog/services/marketplace-products.service';

const fallbackChildren: Record<string, string[]> = {
    'Jewelry & Accessories': ['Earrings', 'Necklaces', 'Bracelets', 'Rings', 'Anklets', 'Brooches & Pins', 'Charms', 'Cufflinks', 'Jewelry Sets', 'Bridal Jewelry', 'Customized Jewelry', 'Jewelry Storage', 'Hair Accessories', 'Scarves & Wraps', 'Watches', 'Sunglasses & Eyewear', 'Belts', 'Phone Accessories', 'Gloves & Mittens', 'Keychains'],
    'Clothing & Shoes': ["Women's Fashion", "Men's Fashion", 'Kids Fashion', 'Shoes'],
    'Bags & Purses': ['Handbags', 'Tote Bags', 'Crossbody Bags', 'Shoulder Bags', 'Clutches', 'Wallets', 'Laptop Bags', 'Travel Bags', 'Backpacks', 'Handmade Leather Goods', 'Cosmetic Bags', 'Coin Purses', 'Pouches', "Kids' Bags", 'Bag Accessories', 'Card Holders'],
    'Home & Living': ['Home Decor', 'Furniture', 'Kitchen & Dining', 'Bedding'],
    'Food & Beverages': ['Homemade Food', 'Organic Food', 'Bakery', 'Chocolates', 'Snacks', 'Gourmet', 'Ice Cream', 'Charcuterie Boards', 'Pickles & Preserves', 'Sauces & Condiments', 'Frozen Food', 'Healthy Food', 'Diet Food', 'Vegan', 'Gluten Free', 'Keto', 'Beverages', 'Tea & Coffee', 'Food Gift Baskets'],
    'Wedding & Party': ['Wedding Dresses', 'Bridal Accessories', 'Bridesmaid Dresses', 'Bridesmaid Gifts', 'Wedding Invitations', 'Wedding Signs', 'Wedding Décor', 'Wedding Favors', 'Cake Toppers', 'Guest Books', 'Party Decorations', 'Birthday Decorations', 'Baby Shower', 'Bridal Shower', 'Engagement', 'Anniversary', 'Graduation', 'Party Supplies', 'Invitations & Cards'],
    'Toys & Entertainment': ['Toys', 'Dolls & Dollhouses', 'Stuffed Animals', 'Educational Toys', 'Wooden Toys', 'Puzzles', 'Games', 'Board Games', 'Pretend Play', "Kids' Crafts", 'Activity Kits', 'Collectibles', 'Miniatures', 'Music & Instruments', 'Party Games'],
    'Art & Collectibles': ['Original Paintings', 'Paintings', 'Prints', 'Photography', 'Digital Art', 'Sculptures', 'Calligraphy', 'Drawings', 'Illustrations', 'Mixed Media', 'Textile Art', 'Fiber Art', 'Ceramic Art', 'Pottery', 'Resin Art', 'Crochet', 'Macrame', 'Glass Art', 'Wood Art', 'Metal Art', 'Folk Art', 'Memorabilia', 'Collectibles', 'Vintage Art', 'Art Objects', 'Handmade Crafts'],
    'Craft Supplies & Tools': ['Beads', 'Jewelry Making Supplies', 'Fabric', 'Yarn', 'Sewing Supplies', 'Embroidery Supplies', 'Knitting Supplies', 'Crochet Supplies', 'Painting Supplies', 'Drawing Supplies', 'Scrapbooking', 'Paper Crafts', 'Candle Making', 'Soap Making', 'Resin Supplies', 'Woodworking Supplies', 'Craft Kits', 'DIY Kits', 'Tools', 'Patterns & Templates'],
    Vintage: ['Vintage Clothing', 'Vintage Jewelry', 'Vintage Home Décor', 'Vintage Furniture', 'Vintage Kitchen', 'Vintage Accessories', 'Vintage Collectibles', 'Vintage Toys', 'Vintage Books', 'Vintage Photography', 'Vintage Art', 'Vintage Wedding', 'Retro Items', 'Antiques'],
    'Books, Stationery & Party Supplies': ['Books', 'E-Books', 'Children Books', 'Art & Coffee Table Books', 'Digital Guides', 'Workbooks', 'Educational Resources', 'Journals', 'Planners', 'Diaries', 'Notebooks', 'Sketchbooks', "Children's Activity Books", 'Magazines', 'Art Supplies', 'Greeting Cards', 'Bookmarks', 'Reading Lights', 'Stickers', 'Gifting Stationery', 'Letter Sets', 'Writing Sets', 'Desk Stationery', 'Office Supplies', 'Invitations', 'Wedding Stationery', 'Wrapping Paper', 'Gift Bags', 'Calendars', 'Party Supplies'],
    'Beauty & Personal Care': ['Skincare', 'Makeup', 'Haircare', 'Perfume & Fragrance', 'Bath & Body', 'Organic Beauty', 'Grooming', 'Beauty Tools', 'Beauty Gift Sets', 'Soaps', 'Bath Bombs', 'Bath Salts', 'Body Scrubs', 'Spa & Wellness'],
    'Electronics & Accessories': ['Phone Cases', 'Laptop Cases', 'Tablet Cases', 'AirPod Cases', 'Tech Accessories', 'Desk Accessories', 'Cable Organizers', 'Keyboard Accessories', 'Computer Accessories', 'Gaming Accessories', 'Personalized Electronics'],
    'Pet Supplies': ['Dog Accessories', 'Cat Accessories', 'Pet Clothing', 'Pet Beds', 'Pet Toys', 'Collars & Leashes', 'Pet Tags', 'Feeding Accessories', 'Pet Memorials', 'Personalized Pet Items', 'Pet Food', 'Grooming'],
    Baby: ['Baby Clothing', 'Baby Accessories', 'Baby Blankets', 'Nursery Decor', 'Baby Toys', 'Teething Toys', 'Feeding Accessories', 'Milestone Cards', 'Baby Shower Gifts', 'Personalized Baby Gifts', 'Pregnancy & Motherhood', 'Nursing Accessories'],
    'Digital Products': ['Digital Planners', 'Templates', 'Presets', 'Printable Art', 'E-books', 'Courses', 'Downloads', 'Digital Downloads', 'Notion Templates', 'Canva Templates', 'Social Media Templates', 'Business Templates', 'Resume Templates', 'Invitations', 'Digital Stickers', 'Fonts', 'SVG Files', 'Cricut Files', 'Sewing Patterns', 'Crochet Patterns', 'Coloring Pages', 'Online Resources', 'Workbooks', 'Children Learning', 'Custom Digital Products'],
    'Gifts & Hampers': ['Personalized Gifts', 'Gift Boxes', 'Corporate Gifts', 'Baby Gifts', 'Anniversary Gifts', 'Birthday Gifts', 'Wedding Gifts', 'Eid Collections', "Mother's Day", "Father's Day", 'Gift Baskets'],
    Wellness: ['Yoga Classes', 'Meditation Classes', 'Pilates Classes', 'Fitness Equipment', 'Supplements', 'Essential Oils', 'Aromatherapy', 'Self Care Kits', 'Wellness Workshops'],
    'Plants & Gardening': ['Indoor Plants', 'Outdoor Plants', 'Succulents', 'Pots', 'Gardening Tools', 'Plant Care'],
    Services: ['Graphic Design', 'Photography', 'Videography', 'Content Creation', 'Branding', 'Decor', 'Catering', 'Makeup Artists', 'Mehndi Artists', 'Nail Artist', 'Eyelash', 'Eyebrow', 'Entertainment', 'Marketing', 'Consultancy', 'Legal', 'Accounting', 'Personal Shopping', 'Interior Design', 'Personal Styling'],
    Workshops: ['Art Workshops', 'Pottery', 'Cooking Classes', 'Baking', 'Business Training', 'Marketing', 'Fitness', 'Yoga', 'Pilates', 'Kids Workshops', 'DIY Workshops', 'Photography'],
    Experiences: ['Food Experiences', 'Farm Visits', 'Art Experiences', 'Wellness Retreats', 'Adventure', 'Cultural Tours', 'Pop-up Experiences', 'Networking Events'],
    Events: ['The Makers Bazar Events', 'Workshops', 'Festivals', 'Exhibitions', 'Food Festivals', 'Concerts', 'Networking', 'Community Events'],
};

function slug(value: string) {
    return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fallbackNode(name: string, parentCode?: string): MarketplaceCategoryMenuNode {
    const ownSlug = slug(name);
    const code = parentCode ? `${parentCode}/${ownSlug}` : ownSlug;
    return {
        id: `fallback-${code}`,
        code,
        slug: ownSlug,
        name,
        parentId: parentCode ? `fallback-${parentCode}` : null,
        children: (fallbackChildren[name] ?? []).map(child => fallbackNode(child, code)),
    };
}

export const fallbackMegaMenuCategories = Object.keys(fallbackChildren).map(name => fallbackNode(name));

const atlasByRoot: Record<string, { src: string; offset: number }> = {
    'jewelry-and-accessories': { src: '/category-atlases/accessories.jpg', offset: 0 },
    'bags-and-purses': { src: '/category-atlases/accessories.jpg', offset: 8 },
    'clothing-and-shoes': { src: '/category-atlases/fashion.jpg', offset: 0 },
    vintage: { src: '/category-atlases/art.jpg', offset: 48 },
    'home-and-living': { src: '/category-atlases/home.jpg', offset: 0 },
    'wedding-and-party': { src: '/category-atlases/home.jpg', offset: 16 },
    'pet-supplies': { src: '/category-atlases/home.jpg', offset: 30 },
    baby: { src: '/category-atlases/home.jpg', offset: 20 },
    'gifts-and-hampers': { src: '/category-atlases/home.jpg', offset: 24 },
    'plants-and-gardening': { src: '/category-atlases/home.jpg', offset: 26 },
    'food-and-beverages': { src: '/category-atlases/food-beauty.jpg', offset: 0 },
    'beauty-and-personal-care': { src: '/category-atlases/food-beauty.jpg', offset: 24 },
    wellness: { src: '/category-atlases/food-beauty.jpg', offset: 35 },
    'art-and-collectibles': { src: '/category-atlases/art.jpg', offset: 0 },
    'craft-supplies-and-tools': { src: '/category-atlases/art.jpg', offset: 17 },
    'toys-and-entertainment': { src: '/category-atlases/art.jpg', offset: 28 },
    'books-stationery-and-party-supplies': { src: '/category-atlases/art.jpg', offset: 39 },
    'digital-products': { src: '/category-atlases/art.jpg', offset: 43 },
    services: { src: '/category-atlases/services.jpg', offset: 0 },
    workshops: { src: '/category-atlases/services.jpg', offset: 16 },
    experiences: { src: '/category-atlases/services.jpg', offset: 24 },
    events: { src: '/category-atlases/services.jpg', offset: 32 },
    'electronics-and-accessories': { src: '/category-atlases/services.jpg', offset: 42 },
};

const atlasCellsByRoot: Record<string, number[]> = {
    'jewelry-and-accessories': [0, 1, 2, 3, 40, 60, 16, 20, 21, 22, 23, 19, 17, 7, 27, 6, 4, 5, 15, 25, 18, 56],
    'bags-and-purses': [8, 9, 10, 30, 11, 12, 48, 13, 29, 34, 31, 32, 51, 53, 16, 52],
    'food-and-beverages': [0, 1, 8, 9, 54, 10, 11, 12, 13, 14, 15, 17, 16, 42, 18, 22, 20, 23, 2, 3, 4, 5, 6, 7],
    'beauty-and-personal-care': [24, 28, 38, 31, 37, 29, 27, 39, 30, 32, 33, 34, 35, 36],
};

function atlasCropStyle(src: string, cell: number) {
    const normalizedCell = cell % 64;
    const column = normalizedCell % 8;
    const row = Math.floor(normalizedCell / 8);
    return {
        backgroundImage: `url(${src})`,
        backgroundPosition: `${(column / 7) * 100}% ${(row / 7) * 100}%`,
        backgroundSize: '800% 800%',
    };
}

function categoryHref(category: MarketplaceCategoryMenuNode) {
    return `/shop?category=${encodeURIComponent(category.code)}#products`;
}

function allDescendants(category: MarketplaceCategoryMenuNode): MarketplaceCategoryMenuNode[] {
    return (category.children ?? []).flatMap(child => [child, ...allDescendants(child)]);
}

function CategoryTile({ category, image, onNavigate }: { category: MarketplaceCategoryMenuNode; image: { src: string; cell: number }; onNavigate: () => void }) {
    return <Link href={categoryHref(category)} onClick={onNavigate} className="group/tile min-w-0 text-center text-primary">
        <span className="relative mx-auto block size-[4.7rem] overflow-hidden rounded-full border border-primary/10 bg-secondary shadow-soft">
            <span role="img" aria-label={category.name} style={atlasCropStyle(image.src, image.cell)} className="absolute inset-0 bg-no-repeat transition duration-300 group-hover/tile:scale-105" />
        </span>
        <span className="mt-2 block text-[0.72rem] font-medium leading-[1.15] text-foreground/85 group-hover/tile:text-clay">{category.name}</span>
    </Link>;
}

function ChildGroup({ category, imageFor, onNavigate }: { category: MarketplaceCategoryMenuNode; imageFor: (category: MarketplaceCategoryMenuNode) => { src: string; cell: number }; onNavigate: () => void }) {
    const descendants = allDescendants(category);
    return <section className="break-inside-avoid border-t border-primary/10 pt-5 first:border-t-0 first:pt-0">
        <Link href={categoryHref(category)} onClick={onNavigate} className="mb-4 inline-flex items-center gap-2 font-display text-xl font-semibold text-primary hover:text-clay">
            {category.name}<ArrowRight className="size-4" />
        </Link>
        {descendants.length ? <div className="grid grid-cols-3 gap-x-4 gap-y-5 xl:grid-cols-5 2xl:grid-cols-6">
            {descendants.map(child => <CategoryTile key={child.id} category={child} image={imageFor(child)} onNavigate={onNavigate} />)}
        </div> : <CategoryTile category={category} image={imageFor(category)} onNavigate={onNavigate} />}
    </section>;
}

export function CategoryMegaMenu({ open, categories, onNavigate }: { open: boolean; categories: MarketplaceCategoryMenuNode[]; onNavigate: () => void }) {
    const menuCategories = categories.length ? categories : fallbackMegaMenuCategories;
    const [activeId, setActiveId] = useState(menuCategories[0]?.id ?? '');
    const active = menuCategories.find(item => item.id === activeId) ?? menuCategories[0];

    if (!open || !active) return null;

    const children = active.children ?? [];
    const grouped = children.filter(child => child.children?.length);
    const ungrouped = children.filter(child => !child.children?.length);
    const renderedCategories = [...ungrouped, ...grouped.flatMap(group => allDescendants(group))];
    const imageIndexByCode = new Map(renderedCategories.map((category, index) => [category.code, index]));
    const atlas = atlasByRoot[active.slug] ?? { src: '/category-atlases/art.jpg', offset: 0 };
    const preferredCells = atlasCellsByRoot[active.slug];
    const imageFor = (category: MarketplaceCategoryMenuNode) => ({
        src: atlas.src,
        cell: preferredCells?.[imageIndexByCode.get(category.code) ?? 0]
            ?? atlas.offset + (imageIndexByCode.get(category.code) ?? 0),
    });

    return <section id="desktop-category-menu" aria-label="Browse marketplace categories" className="absolute inset-x-0 top-full z-[60] hidden border-t border-primary/15 bg-[#fffdf6] text-foreground shadow-[0_26px_55px_-24px_rgba(20,44,31,0.42)] lg:block">
        <div className="mx-auto grid h-[min(650px,calc(100vh-9.7rem))] min-h-[500px] w-full max-w-[1500px] grid-cols-[285px_minmax(0,1fr)] overflow-hidden px-8 xl:px-12">
            <nav aria-label="Parent categories" className="overflow-y-auto border-r border-primary/12 py-5 pr-5">
                <p className="px-4 pb-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-clay">Shop categories</p>
                {menuCategories.map(category => {
                    const selected = category.id === active.id;
                    return <Link key={category.id} href={categoryHref(category)} onMouseEnter={() => setActiveId(category.id)} onFocus={() => setActiveId(category.id)} onClick={onNavigate}
                        className={`flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition ${selected ? 'bg-[#eee7d8] font-semibold text-primary' : 'text-foreground/78 hover:bg-secondary/60 hover:text-primary'}`}>
                        <span>{category.name}</span><ChevronRight className={`size-3.5 shrink-0 transition ${selected ? 'translate-x-0 text-clay' : '-translate-x-1 text-muted-foreground'}`} />
                    </Link>;
                })}
            </nav>

            <div className="overflow-y-auto px-9 py-7 xl:px-12">
                <header className="mb-7 flex items-start justify-between gap-6 border-b border-primary/10 pb-6">
                    <div><div className="flex items-center gap-2 text-clay"><Grid3X3 className="size-4" /><p className="text-[0.68rem] font-bold uppercase tracking-[0.16em]">Explore the Bazar</p></div><h2 className="mt-2 font-display text-4xl font-semibold text-primary">{active.name}</h2>{active.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{active.description}</p> : null}</div>
                    <Link href={categoryHref(active)} onClick={onNavigate} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/15 px-5 py-2.5 text-xs font-bold text-primary hover:border-gold hover:bg-gold/10">Shop all <ArrowRight className="size-4" /></Link>
                </header>

                {children.length ? <div className="space-y-8">
                    {ungrouped.length ? <section><h3 className="mb-5 font-display text-xl font-semibold text-primary">Shop by category</h3><div className="grid grid-cols-4 gap-x-5 gap-y-6 xl:grid-cols-7 2xl:grid-cols-8">{ungrouped.map(child => <CategoryTile key={child.id} category={child} image={imageFor(child)} onNavigate={onNavigate} />)}</div></section> : null}
                    {grouped.map(group => <ChildGroup key={group.id} category={group} imageFor={imageFor} onNavigate={onNavigate} />)}
                </div> : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-primary/20 bg-secondary/25 text-center"><div><p className="font-display text-2xl text-primary">Explore {active.name}</p><p className="mt-2 text-sm text-muted-foreground">Open this category to see all available listings.</p></div></div>}
            </div>
        </div>
    </section>;
}
