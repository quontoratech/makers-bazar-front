import { ArrowRight, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StorefrontShell } from '@/components/storefront/storefront-shell';

type Policy = { title: string; intro: string; sections: Array<{ title: string; body: string }> };
const policies: Record<string, Policy> = {
    shipping: {
        title: 'Shipping & delivery',
        intro: 'Delivery options depend on the listing, vendor and destination. Review the final details at checkout.',
        sections: [
            { title: 'Where we deliver', body: 'Each vendor sets the locations they serve. Enter your delivery location to see listings available to you. An item may be available for pickup, vendor delivery, courier delivery or digital access, depending on that listing.' },
            { title: 'Costs and timing', body: 'The checkout quote shows the delivery charge before you confirm an order. Preparation and estimated delivery times appear on eligible listings where the vendor has supplied them. Different vendors in one cart may have different charges and delivery schedules.' },
            { title: 'Order updates', body: 'After purchase, your account shows vendor order status, tracking details when provided and any customer-visible delivery notes. Contact order support from your account if a parcel is late, missing or arrives incorrectly.' },
            { title: 'Digital and bookable items', body: 'Digital goods, services, events and workshops may use downloads, bookings or tickets instead of physical shipping. Their delivery and attendance instructions appear on the relevant listing and in your account.' },
        ],
    },
    returns: {
        title: 'Returns, disputes & refunds',
        intro: 'If an order is wrong or an item needs to be returned, open an appeal from the affected vendor order in your account.',
        sections: [
            { title: 'Appeal window', body: 'The return deadline is shown on each eligible delivered or fulfilled vendor order. The window is calculated from the confirmed delivery date and may be seven or fourteen days according to the active marketplace setting. Submit your appeal before the deadline.' },
            { title: 'Selected items and quantities', body: 'You may identify only the products and quantities affected. Include a clear reason and any relevant evidence. An active appeal must be resolved before another appeal for that vendor order can be opened.' },
            { title: 'Review and product return', body: 'The super administrator reviews the case with the vendor and records a customer-visible decision. When physical goods must be returned, the selected goods must be received before the refund is prepared. A return is not automatically approved when an appeal is opened.' },
            { title: 'Refund payment', body: 'After approval, the finance team records the amount owed and validated customer payout details. A refund is marked paid only after the company completes an external transfer and records its transaction reference. The case and account show the current refund status. Product-only returns do not automatically include the original delivery fee.' },
            { title: 'Help with a decision', body: 'Keep communicating in the case thread if more information is needed. For a separate concern about a vendor or listing, use the report form.' },
        ],
    },
    privacy: {
        title: 'Privacy notice',
        intro: 'This draft explains the information used to operate your marketplace account and orders.',
        sections: [
            { title: 'Information you provide', body: 'Account registration and checkout collect identity, contact and delivery details. Vendor and organizer applications may also collect business profile information, verification documents and payout details. Support cases can include your messages and uploaded evidence.' },
            { title: 'How it is used', body: 'The marketplace uses this information to authenticate accounts, process purchases and bookings, show order updates, review applications, support customers, investigate disputes and administer vendor payouts.' },
            { title: 'Who can access it', body: 'Customers see their own account and order information. Vendors receive information needed to fulfil their own orders. Authorized administrators review applications, support cases and finance records. Private administrator–vendor return discussions are not shown in the customer case view.' },
            { title: 'Account choices', body: 'You can update supported profile and delivery details from your account. Optional marketing consent is separate from accepting the account terms. For an access or correction request that is not available in your account, contact marketplace support.' },
            { title: 'Security and retention', body: 'We use authenticated access and role permissions for account, order and application records. Records may need to remain available for order support, accounting and dispute handling; the final retention schedule will be published after policy approval.' },
        ],
    },
    terms: {
        title: 'Marketplace terms',
        intro: 'These draft terms describe how customer accounts, vendor listings and orders work on The Makers Bazar.',
        sections: [
            { title: 'Accounts', body: 'Use accurate registration details and protect your login credentials. Some activities require email verification. Vendor, organizer and other professional roles require application review before the relevant workspace becomes available.' },
            { title: 'Listings and orders', body: 'Published listing details, prices and availability come from approved vendors. Review the selected variant, quantity, vendor, fulfilment method, delivery quote and order total before confirming a purchase.' },
            { title: 'Payment confirmation', body: 'Where direct purchase is offered, the company records receipt of the customer payment before treating it as settled. The site does not automatically charge a card or execute a refund through a payment gateway.' },
            { title: 'Problems and disputes', body: 'Report missing, damaged or incorrect items through the relevant order or support route. A return appeal is reviewed by the super administrator, with vendor input, under the return process shown on this site.' },
            { title: 'Respectful use', body: 'Do not submit false identity, order, review or application information, misuse another person’s account, or interfere with marketplace operations.' },
        ],
    },
    vendor: {
        title: 'Vendor policy',
        intro: 'This draft describes the responsibilities of applicants and approved shops.',
        sections: [
            { title: 'Application and verification', body: 'Provide accurate business and category information, documents and payout details. A submitted application does not create an approved shop. Administrators may request corrections or decline an application.' },
            { title: 'Listings and fulfilment', body: 'Publish only items and services you can provide. Keep descriptions, prices, stock, availability, shipping areas and business contact details current. Follow the fulfilment terms shown to customers.' },
            { title: 'Customer issues', body: 'Respond to order and return case messages in the vendor workspace. The super administrator makes the final return and refund decision after reviewing the case and vendor response.' },
            { title: 'Payouts and adjustments', body: 'Vendor earnings are calculated from confirmed seller orders under the applicable commission and payout rules. Returns, refunds and other approved adjustments may reduce a vendor balance; a completed external bank transfer cannot be pulled back automatically.' },
        ],
    },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const policy = policies[(await params).slug];
    return { title: policy?.title ?? 'Policy' };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
    const policy = policies[(await params).slug];
    if (!policy) notFound();
    return <StorefrontShell>
        <section className="border-b border-border bg-sand/55"><div className="mx-auto max-w-[1340px] px-6 py-14 md:px-12 md:py-20"><p className="eyebrow">Marketplace information</p><h1 className="mt-3 max-w-4xl text-5xl leading-none text-primary md:text-6xl">{policy.title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{policy.intro}</p></div></section>
        <section className="mx-auto grid max-w-[1340px] gap-10 px-6 py-12 md:grid-cols-[240px_1fr] md:px-12 md:py-16">
            <aside><div className="sticky top-36 rounded-2xl border border-border bg-card p-5"><FileText className="h-6 w-6 text-primary" /><h2 className="mt-3 text-lg text-primary">Policies</h2><nav className="mt-4 grid gap-2 text-sm">{Object.entries(policies).map(([slug, item]) => <Link key={slug} href={`/policies/${slug}`} className={`rounded-lg px-3 py-2 ${item === policy ? 'bg-primary font-semibold text-ivory' : 'text-muted-foreground hover:bg-secondary hover:text-primary'}`}>{item.title}</Link>)}</nav></div></aside>
            <div><div className="mb-7 rounded-2xl border border-gold/50 bg-card px-5 py-4 text-sm leading-6 text-muted-foreground"><strong className="text-primary">Draft for review.</strong> Final approved policy text will replace this page. Order-specific prices, deadlines and delivery options shown at checkout or in your account take precedence over this general draft.</div>
                <div className="space-y-5">{policy.sections.map(section => <section key={section.title} className="rounded-2xl border border-border bg-card p-6 md:p-8"><h2 className="text-2xl text-primary">{section.title}</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{section.body}</p></section>)}</div>
                <div className="mt-9 flex flex-wrap gap-3"><Link href="/account" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-ivory">Your account <ArrowRight className="h-4 w-4" /></Link><Link href="/dashboard/customer/support" className="inline-flex items-center rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary">Order support</Link></div>
            </div>
        </section>
    </StorefrontShell>;
}
