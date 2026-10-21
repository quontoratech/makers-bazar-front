import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, Heart, HeartHandshake, Leaf, Mail, MapPin, Sparkles, Store, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { MakersHero } from '@/components/storefront/makers-hero';
import { MakerSlider } from '@/components/storefront/maker-slider';
import { ProductCard } from '@/components/storefront/product-card';
import { ProductCardQuickAdd } from '@/components/storefront/product-card-quick-add';
import { SiteFooter } from '@/components/storefront/site-footer';
import { SiteHeader } from '@/components/storefront/site-header';
import { catalogProductSummary, getMarketplaceProducts, getMarketplaceVendors } from '@/features/catalog/services/marketplace-products.service';
import { getMarketplaceArticles } from '@/features/content/services/marketplace-articles.service';
import type { CatalogProduct } from '@/features/vendor-catalog/types';
import { formatMoney } from '@/lib/format';

const asset = (name: string) => `/makers-assets/${name}`;
const feelings = [
    { label: 'Something Beautiful', image: 'tile-beautiful.jpg', href: '/shop?q=beautiful' },
    { label: 'Something Handmade', image: 'tile-handmade.jpg', href: '/shop?type=physical' },
    { label: 'Something for My Home', image: 'tile-home.jpg', href: '/shop?q=home' },
    { label: 'Something for Someone I Love', image: 'tile-gift.jpg', href: '/shop?q=gift' },
    { label: 'Something for My Little One', image: 'workshop-paint.jpg', href: '/shop?q=kids' },
    { label: 'Something to Experience', image: 'workshop-pottery.jpg', href: '/shop?type=event#products' },
];
const bazarCategories = [
    { label: 'Fashion', image: 'prod-scarf.jpg', query: 'fashion', className: 'lg:row-span-2' },
    { label: 'Home', image: 'tile-home.jpg', query: 'home' },
    { label: 'Jewelry', image: 'prod-earrings.jpg', query: 'jewelry' },
    { label: 'Food', image: 'food-bakery.jpg', query: 'food' },
    { label: 'Gifts', image: 'tile-gift.jpg', query: 'gift' },
    { label: 'Art', image: 'workshop-pottery.jpg', query: 'art', className: 'lg:col-start-4 lg:row-span-2 lg:row-start-1' },
    { label: 'Kids', image: 'workshop-paint.jpg', query: 'kids' },
];

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`mx-auto w-full max-w-[1350px] px-6 md:px-12 ${className}`}>{children}</div>;
}
function SectionHead({ eyebrow, title, copy, href, action, inverse = false }: { eyebrow: string; title: string; copy?: string; href?: string; action?: string; inverse?: boolean }) {
    return <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl"><p className={inverse ? 'text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-gold' : 'eyebrow'}>{eyebrow}</p><h2 className={`mt-4 text-[2.75rem] font-medium leading-[0.98] tracking-[-0.025em] md:text-[3.75rem] ${inverse ? 'text-ivory' : 'text-primary'}`}>{title}</h2>{copy ? <p className={`mt-5 max-w-2xl text-[1.05rem] md:text-[1.15rem] ${inverse ? 'text-ivory/70' : 'text-muted-foreground'}`}>{copy}</p> : null}</div>
        {href ? <Link href={href} className={`mb-1 shrink-0 text-sm font-semibold hover:underline md:text-base ${inverse ? 'text-ivory' : 'text-primary'}`}>{action ?? 'Explore all'} →</Link> : null}
    </div>;
}
function ProductGrid({ products }: { products: CatalogProduct[] }) {
    return products.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-5">{products.map(product => <ProductCard key={product.id} product={catalogProductSummary(product)} showQuickAdd />)}</div>
        : <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">No published listings available for this section yet.</div>;
}

function DealCard({ product }: { product: CatalogProduct }) {
    const summary = catalogProductSummary(product);
    const saving = summary.compareAtPrice ? Math.max(0, summary.compareAtPrice - summary.price) : 0;
    return <article className="group overflow-hidden rounded-2xl bg-card text-foreground">
        <div className="relative h-[155px] overflow-hidden md:h-[165px]"><Link href={`/products/${summary.slug}`} className="relative block size-full">
            <Image src={summary.image} alt={summary.name} fill unoptimized={/^https?:\/\//i.test(summary.image)} className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 50vw, 25vw" />
            <span className="absolute left-4 top-4 rounded-full bg-clay px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-ivory">{saving ? `Save ${formatMoney(saving)}` : 'Popular deal'}</span>
        </Link><ProductCardQuickAdd product={summary} /></div>
        <div className="p-5"><p className="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-clay">{summary.vendor}</p><Link href={`/products/${summary.slug}`} className="mt-2 block font-display text-[1.2rem] font-semibold leading-tight text-primary">{summary.name}</Link><p className="mt-4 text-sm font-semibold text-primary">{formatMoney(summary.price)} {summary.compareAtPrice ? <span className="ml-2 text-xs font-normal text-muted-foreground line-through">{formatMoney(summary.compareAtPrice)}</span> : null}</p></div>
    </article>;
}

function DealsShowcase({ products }: { products: CatalogProduct[] }) {
    const [featured, ...secondary] = products;
    if (!featured) return null;
    const summary = catalogProductSummary(featured);
    const saving = summary.compareAtPrice ? Math.max(0, summary.compareAtPrice - summary.price) : 0;
    return <div className="grid gap-5 lg:grid-cols-[1.12fr_0.96fr]">
        <article className="relative min-h-[460px] overflow-hidden rounded-[1.75rem] lg:min-h-[520px]">
            <Image src={summary.image} alt={summary.name} fill priority unoptimized={/^https?:\/\//i.test(summary.image)} className="object-cover" sizes="(max-width: 1024px) 100vw, 56vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/95 via-forest-deep/10 to-transparent" />
            <span className="absolute left-6 top-6 rounded-full bg-clay px-5 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ivory">Deal of the day</span>
            <div className="absolute inset-x-0 bottom-0 p-7 text-ivory md:p-10"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ivory/75">By {summary.vendor}</p><h3 className="mt-3 max-w-xl text-[2.6rem] font-medium leading-[0.98] md:text-[3.2rem]">{summary.name}</h3><p className="mt-4 max-w-xl text-sm text-ivory/75">A standout Makers Bazar find, available now at a special price.</p><p className="mt-6 text-xl font-semibold">{formatMoney(summary.price)} {summary.compareAtPrice ? <span className="ml-3 text-sm font-normal text-ivory/60 line-through">{formatMoney(summary.compareAtPrice)}</span> : null} {saving ? <span className="ml-3 rounded-full border border-gold/60 px-3 py-1 text-xs font-medium text-gold">Save {formatMoney(saving)}</span> : null}</p><Link href={`/products/${summary.slug}`} className="gold-button mt-7 inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-semibold">Shop this deal <ArrowRight className="size-4" /></Link></div>
        </article>
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-rows-2">{secondary.slice(0, 4).map(product => <DealCard key={product.id} product={product} />)}</div>
    </div>;
}

function BundleOffer() {
    return <section className="pb-16 pt-2 md:pb-24"><Container><div className="gold-panel relative overflow-hidden rounded-[1.75rem] px-7 py-10 md:px-12"><div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]"><div className="relative z-10 max-w-xl"><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-primary">Bundle & save 15%</p><h2 className="mt-3 text-[2.7rem] font-semibold leading-[0.98] text-primary md:text-[3.6rem]">The Slow Morning Bundle</h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-foreground/75">A hand-thrown mug, botanical soap and clay candle — three independent makers, one thoughtful box.</p><Link href="/shop?q=slow%20morning" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-ivory">Shop the bundle <ArrowRight className="h-4 w-4" /></Link></div><div className="flex items-end justify-center -space-x-8">{['tile-home.jpg', 'prod-soap.jpg', 'prod-candle.jpg'].map((image, index) => <img key={image} src={asset(image)} alt="Product in the Slow Morning bundle" className={`h-44 w-36 rounded-2xl border-4 border-ivory object-cover shadow-lift md:h-56 md:w-44 ${index === 1 ? '-translate-y-5' : ''}`} />)}</div></div></div></Container></section>;
}

function LocalFoodAndCommunity() {
    const posts = [
        ['ugc-1.jpg', '@sanaa.home', 'Morning mugs made better', 'bg-primary text-ivory'],
        ['ugc-2.jpg', '@rimsha.makes', 'My very first plate', 'bg-gold text-foreground'],
        ['ugc-3.jpg', '@thehouseonhill', 'Living-room finds', 'bg-clay text-ivory'],
        ['tile-gift.jpg', '@aliya.gifts', 'Wrapped with love', 'bg-primary text-ivory'],
    ] as const;
    return <>
        <section className="bg-sand/55 py-16 md:py-24"><Container><div className="grid gap-14 lg:grid-cols-2 lg:items-center"><div className="relative pb-10"><img src={asset('food-bakery.jpg')} alt="Artisan bread and pastries" className="h-[420px] w-[85%] rounded-2xl object-cover shadow-soft" /><img src={asset('food-hamper.jpg')} alt="Curated local food hamper" className="absolute bottom-0 right-0 h-[240px] w-[55%] rounded-2xl object-cover shadow-lift" /></div><div><h2 className="text-[2.7rem] leading-[1.03] text-primary md:text-[3.3rem]">Made locally.<br />Delivered to you.</h2><p className="mt-5 max-w-md text-muted-foreground">Home bakers, small-batch chefs and neighbourhood roasters — the flavours of the city, beautifully packed.</p><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{['Fresh Bakes', 'Pantry', 'Sweet Treats', 'Coffee', 'Tea', 'Gift Hampers'].map(item => <Link key={item} href={`/shop?q=${encodeURIComponent(item)}`} className="rounded-xl bg-card px-4 py-4 text-sm text-foreground/80 shadow-soft">{item}</Link>)}</div><Link href="/shop?type=perishable" className="gold-button mt-9 inline-flex rounded-full px-7 py-3.5 text-sm font-semibold">Explore Food →</Link></div></div></Container></section>
        <section className="bg-sand/55 pb-16 md:pb-24"><Container><div className="mb-10 text-center"><p className="eyebrow">Made with love</p><h2 className="mt-3 text-[2.8rem] text-primary md:text-[3.6rem]">You Made Our Day</h2><p className="mt-3 text-muted-foreground">Real homes, real hands and real moments shared by our community.</p></div><div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-4 lg:gap-5">{posts.map(([image, handle, caption, panel], index) => <figure key={handle} className={`overflow-hidden rounded-2xl shadow-soft ${index % 2 ? 'lg:mt-8' : ''}`}><img src={asset(image)} alt={caption} className="h-[245px] w-full object-cover md:h-[310px]" /><figcaption className={`${panel} flex min-h-24 items-start justify-between gap-3 p-4`}><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] opacity-75">{handle}</p><p className="mt-1 font-display text-lg leading-tight">{caption}</p></div><Heart className="h-5 w-5 shrink-0 fill-current" /></figcaption></figure>)}</div></Container></section>
    </>;
}

function JourneyPanel() {
    return <div className="mt-5 grid overflow-hidden rounded-[1.75rem] bg-sand/70 lg:grid-cols-2"><div className="grid grid-cols-2 gap-2 p-2"><img src={asset('maker-2.jpg')} alt="A local textile maker at work" className="h-[340px] w-full rounded-2xl object-cover" /><div className="grid gap-2"><img src={asset('prod-scarf.jpg')} alt="Finished handmade scarf" className="h-[166px] w-full rounded-2xl object-cover" /><img src={asset('tile-handmade.jpg')} alt="Traditional making process" className="h-[166px] w-full rounded-2xl object-cover" /></div></div><div className="flex flex-col justify-center px-8 py-10 md:px-12"><p className="eyebrow">Our Journey</p><h3 className="mt-3 text-[2.5rem] leading-[1.02] text-primary md:text-[3rem]">From a shared table to a nationwide bazar.</h3><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">The Makers Bazar began with a simple belief: remarkable local work should be easier to discover. We bring products, food, workshops and stories together so makers can grow — and shoppers can buy with meaning.</p><a href="#makers" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">Meet our community <ArrowRight className="h-4 w-4" /></a></div></div>;
}

function ExperienceShowcase() {
    const experiences = [
        { name: 'Wheel Throwing for Beginners', host: 'Noor Studio', location: 'Lahore', date: 'Sat, 6 Sep · 4:00 PM', price: 'PKR 6,500', seats: '3 seats left', image: 'workshop-pottery.jpg' },
        { name: 'Paint & Sip Evening', host: 'Canvas Club', location: 'Karachi', date: 'Fri, 12 Sep · 7:00 PM', price: 'PKR 4,000', seats: '8 seats left', image: 'workshop-paint.jpg' },
        { name: 'Seasonal Flower Arranging', host: 'The Stem Room', location: 'Islamabad', date: 'Sun, 14 Sep · 11:00 AM', price: 'PKR 5,200', seats: '5 seats left', image: 'workshop-flowers.jpg' },
    ];
    return <section id="workshops" className="bg-sand/50 py-16 md:py-24"><Container><SectionHead eyebrow="Workshops & experiences" title="Don't Just Shop. Experience." href="/shop?type=event#products" action="All experiences" /><div className="grid gap-6 md:grid-cols-3">{experiences.map(experience => <article key={experience.name} className="group overflow-hidden rounded-2xl bg-card transition duration-300 hover:-translate-y-1.5 hover:shadow-lift"><div className="overflow-hidden"><img src={asset(experience.image)} alt={experience.name} className="h-[220px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /></div><div className="p-6"><p className="text-[0.72rem] uppercase tracking-[0.14em] text-clay">Hosted by {experience.host}</p><h3 className="mt-2 text-[1.5rem] leading-tight text-primary">{experience.name}</h3><div className="mt-4 space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{experience.date}</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{experience.location}</p><p className="flex items-center gap-2 text-clay"><Users className="h-4 w-4" />{experience.seats}</p></div><div className="mt-6 flex items-center justify-between border-t border-border pt-5"><span className="text-[1.05rem] text-primary">{experience.price}</span><Link href="/shop?type=event#products" className="gold-button rounded-full px-5 py-2.5 text-xs font-semibold">Book Now</Link></div></div></article>)}</div></Container></section>;
}

export default async function HomePage() {
    const [catalog, vendors, articles] = await Promise.all([
        getMarketplaceProducts({ sort: 'POPULARITY' }),
        getMarketplaceVendors(),
        getMarketplaceArticles(),
    ]);
    const approved = catalog.filter(product => product.enabled && product.status === 'PUBLISHED');
    const discounted = approved.filter(product => product.variants.some(variant => variant.compareAtPrice && variant.compareAtPrice > variant.priceWithTax));
    const deals = [...discounted, ...approved.filter(product => !discounted.some(deal => deal.id === product.id))].slice(0, 5);
    const giftMatches = approved.filter(product => /gift/i.test(`${product.categoryName} ${product.name} ${product.metadata?.tags?.join(' ') ?? ''}`));
    const gifts = [...giftMatches, ...approved.filter(product => !giftMatches.some(gift => gift.id === product.id))].slice(0, 5);
    const featuredVendors = vendors.filter(vendor => approved.some(product => product.vendorProfileId === vendor.id));

    return <div className="makers-theme min-h-screen">
        <SiteHeader />
        <main>
            <MakersHero vendorCount={vendors.length} featuredVendorSlug={featuredVendors[0]?.slug} />

            <section id="discover" className="py-14 md:py-20"><Container>
                <SectionHead eyebrow="Discover your way" title="What are you looking for today?" copy="Start with a feeling, not a category. The Bazar will take you somewhere unexpected." href="/shop" action="Browse everything" />
                <div className="grid grid-cols-2 gap-4 lg:h-[520px] lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
                    {[0, 1, 2, 4, 5, 3].map((index, position) => {
                        const feeling = feelings[index]!;
                        const large = position === 0 || position === 5;
                        return <Link key={feeling.label} href={feeling.href} className={`group relative min-h-[240px] overflow-hidden rounded-2xl ${position === 0 ? 'lg:col-span-3 lg:row-span-2' : position === 5 ? 'lg:col-span-3 lg:row-span-2 lg:row-start-1 lg:col-start-10' : 'lg:col-span-3'}`}>
                            <img src={asset(feeling.image)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/10 to-transparent" />
                            <div className={`absolute inset-x-0 bottom-0 text-ivory ${large ? 'p-6' : 'p-5'}`}><p className={`font-display leading-tight ${large ? 'text-[1.8rem]' : 'text-[1.45rem]'}`}>{feeling.label}</p><span className="mt-2 inline-flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.18em] uppercase text-ivory/75">Explore <ArrowUpRight className="h-3.5 w-3.5" /></span></div>
                        </Link>;
                    })}
                </div>
            </Container></section>

            {approved.length ? <section id="products" className="py-16 md:py-24"><Container><SectionHead eyebrow="Community favourites" title="Shop Our Most Loved Products" copy="The handmade finds customers keep coming back for." href="/shop" action="Shop all" /><ProductGrid products={approved.slice(0, 5)} /></Container></section> : null}

            <section className="bg-sand/55 py-12 md:py-16"><Container>
                <SectionHead eyebrow="Explore" title="Explore the Bazar" href="/shop" action="View all categories" />
                <div className="grid grid-cols-2 gap-4 lg:h-[500px] lg:grid-cols-5 lg:grid-rows-2 lg:gap-5">
                    {bazarCategories.map(category => <Link key={category.label} href={`/shop?q=${encodeURIComponent(category.query)}`} className={`group relative min-h-[190px] overflow-hidden rounded-2xl ${category.className ?? ''}`}>
                        <img src={asset(category.image)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/50 via-transparent to-transparent" />
                        <span className="absolute bottom-5 left-5 rounded-xl bg-background/95 px-5 py-3 text-sm font-semibold text-primary shadow-soft">{category.label}</span>
                    </Link>)}
                </div>
            </Container></section>

            {deals.length ? <section id="deals" className="bg-primary py-12 text-ivory md:py-16"><Container><div className="relative"><div className="absolute right-0 top-20 hidden items-center gap-2 rounded-full bg-gold px-5 py-2 text-xs font-semibold text-foreground md:flex"><Clock3 className="size-4" /> Ends tonight</div><SectionHead eyebrow="Limited-time savings" title="Today’s Big Deals" copy="A fresh edit of Makers Bazar favourites, with special prices for today only." inverse /><DealsShowcase products={deals} /><Link href="/shop" className="mx-auto mt-6 flex w-fit items-center gap-2 text-sm font-semibold text-gold">See every deal <ArrowRight className="size-4" /></Link></div></Container></section> : null}
            {gifts.length ? <section className="py-16 md:py-24"><Container><SectionHead eyebrow="Give something meaningful" title="Special Gifts for Your Loved Ones" copy="Small-batch, personal and made to be remembered." href="/shop?q=gift" action="Explore gifts" /><ProductGrid products={gifts} /></Container></section> : null}
            <BundleOffer />

            {featuredVendors.length ? <section id="makers" className="bg-[#fbfaf5] py-16 md:py-24"><Container><MakerSlider vendors={featuredVendors} /></Container></section> : null}

            <ExperienceShowcase />
            <LocalFoodAndCommunity />

            <section className="py-14 md:py-20"><Container>
                <div className="mb-11 text-center"><p className="eyebrow">Our purpose</p><h2 className="mt-3 text-[2.55rem] text-primary md:text-[3.25rem]">What is The Makers Bazar?</h2><p className="mt-3 text-muted-foreground">A marketplace for original things and the people who make them.</p></div>
                <div className="grid gap-5 md:grid-cols-3">{[
                    { icon: HeartHandshake, title: 'Human by design', copy: 'Browse independent shops and the stories their owners choose to share.' },
                    { icon: Sparkles, title: 'Made to discover', copy: 'Products, services, workshops and events come together in one place.' },
                    { icon: Leaf, title: 'Local at heart', copy: 'Find approved makers and businesses serving your selected location.' },
                ].map(({ icon: Icon, title, copy }, index) => <article key={title} className={`rounded-[1.5rem] p-7 ${index === 1 ? 'gold-panel' : 'bg-primary text-ivory'}`}><span className={`grid h-12 w-12 place-items-center rounded-full ${index === 1 ? 'bg-primary text-ivory' : 'bg-ivory/12 text-gold'}`}><Icon className="h-5 w-5" /></span><h3 className={`mt-7 text-2xl ${index === 1 ? 'text-primary' : 'text-ivory'}`}>{title}</h3><p className={`mt-3 text-sm leading-relaxed ${index === 1 ? 'text-foreground/70' : 'text-ivory/70'}`}>{copy}</p></article>)}</div>
                <JourneyPanel />
            </Container></section>

            <section className="py-6"><Container><div className="relative overflow-hidden rounded-[1.75rem] bg-primary px-8 py-12 text-ivory md:px-14"><img src={asset('maker-1.jpg')} alt="" className="absolute right-0 top-0 hidden h-full w-[38%] object-cover opacity-45 lg:block" /><div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/25" /><div className="relative max-w-2xl"><span className="grid h-12 w-12 place-items-center rounded-full bg-gold text-foreground"><Store className="h-5 w-5" /></span><p className="mt-5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-gold">Sell on The Makers Bazar</p><h2 className="mt-3 text-[2.7rem] leading-[0.98] text-ivory md:text-[3.7rem]">Turn your craft into your next chapter.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-ivory/70">Create a shop, tell your story and reach customers looking for original local work.</p><Link href="/apply/vendor" className="gold-button mt-7 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold">Sign up as a vendor <ArrowRight className="h-4 w-4" /></Link></div></div></Container></section>

            <section className="py-14 md:py-20"><Container><SectionHead eyebrow="Reading" title="The Makers Journal" href="/stories" action="All stories" />{articles.length ? <div className="grid gap-5 md:grid-cols-3">{articles.slice(0, 3).map(article => <Link key={article.id} href={`/stories/${article.slug}`} className="group rounded-2xl bg-card p-7 shadow-soft"><p className="eyebrow">{article.tags?.[0] ?? 'Story'}</p><h3 className="mt-3 text-[1.8rem] leading-tight text-primary group-hover:text-clay">{article.title}</h3><p className="mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground">{article.excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read story <ArrowRight className="h-4 w-4" /></span></Link>)}</div> : <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]"><article><img src={asset('journal-1.jpg')} alt="Hands wrapping a handmade ceramic mug" className="h-[390px] w-full rounded-2xl object-cover" /><p className="eyebrow mt-5">Meet the Maker</p><h3 className="mt-2 max-w-xl text-[2.25rem] leading-tight text-primary">The quiet economics of making things slowly</h3><p className="mt-3 text-sm text-muted-foreground">What it takes to run a one-person studio in Pakistan — in time, clay and patience.</p></article><div className="grid content-start gap-5">{([['journal-2.jpg', 'How It’s Made', 'How a ceramic mug is really made'], ['journal-3.jpg', 'Gift Guides', 'Seven gifts that mean something']] as const).map(([image, topic, title]) => <article key={title} className="grid grid-cols-[130px_1fr] gap-5 rounded-2xl bg-card p-3 shadow-soft"><img src={asset(image)} alt={title} className="h-[125px] w-full rounded-xl object-cover" /><div className="self-center"><p className="eyebrow">{topic}</p><h3 className="mt-2 text-[1.35rem] leading-snug text-primary">{title}</h3><p className="mt-2 text-xs text-muted-foreground">5 min read</p></div></article>)}</div></div>}</Container></section>

            <section className="gold-panel py-14 md:py-16"><Container><div className="mx-auto max-w-4xl text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-ivory"><Mail className="h-5 w-5" /></span><p className="mt-5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-primary">A little inspiration in your inbox</p><h2 className="mt-3 text-[2.8rem] leading-[0.98] text-primary md:text-[4rem]">Join the Makers Bazar circle</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/70">New makers, meaningful gifts, workshop dates and stories worth saving — sent occasionally, always thoughtfully.</p><form action="/signup" className="mx-auto mt-7 flex max-w-xl flex-col gap-3 rounded-2xl bg-ivory/65 p-2 sm:flex-row"><label htmlFor="newsletter-email" className="sr-only">Email address</label><input id="newsletter-email" name="email" type="email" required placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none" /><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-ivory">Join the circle <ArrowRight className="h-4 w-4" /></button></form><p className="mt-3 text-xs text-foreground/55">No clutter. Unsubscribe whenever you like.</p></div></Container></section>

            <section id="faqs" className="py-14 md:py-20"><Container className="max-w-5xl"><div className="mb-9 text-center"><p className="eyebrow">Need to know</p><h2 className="mt-3 text-[2.55rem] text-primary md:text-[3.25rem]">Frequently Asked Questions</h2></div><div className="overflow-hidden rounded-2xl border border-border bg-card">{[
                ['What can I find on The Makers Bazar?', 'Browse current published products, food, services, digital goods, events and workshops from approved vendors.'],
                ['How can I return an order?', 'After delivery, open a return appeal for the affected product and quantity from your account. The deadline shown there depends on the configured return window.'],
                ['Can I buy from more than one maker?', 'You can add products from different shops to one cart. Checkout shows each vendor order and its delivery terms.'],
                ['How can I sell on The Makers Bazar?', 'Complete the vendor application and onboarding form. Our team reviews each request before a shop can be published.'],
            ].map(([question, answer]) => <details key={question} className="group border-b border-border p-5 last:border-0 md:px-7"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-xl font-semibold text-primary">{question}<span className="text-2xl font-normal text-clay transition-transform group-open:rotate-45">+</span></summary><p className="max-w-3xl pt-4 text-sm leading-7 text-muted-foreground">{answer}</p></details>)}</div></Container></section>
        </main>
        <SiteFooter />
    </div>;
}
