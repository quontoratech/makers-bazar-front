import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { getMarketplaceArticles } from '@/features/content/services/marketplace-articles.service';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const story = (await getMarketplaceArticles()).find(item => item.slug === slug);
    return { title: story?.title ?? 'Story', description: story?.excerpt };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const story = (await getMarketplaceArticles()).find(item => item.slug === slug);
    if (!story) notFound();
    return <StorefrontShell>
        <article className="mx-auto max-w-[920px] px-6 py-14 md:px-12 md:py-20">
            <Link href="/stories" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All stories</Link>
            <p className="eyebrow mt-10">{story.tags?.join(' · ') || 'The Makers Journal'}</p>
            <h1 className="mt-3 text-5xl leading-none text-primary md:text-6xl">{story.title}</h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{story.excerpt}</p>
            <div className="mt-10 border-t border-border pt-8 text-base leading-8 text-foreground">{story.body.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="mb-5 whitespace-pre-line">{paragraph}</p>)}</div>
        </article>
    </StorefrontShell>;
}
