import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { getMarketplaceArticles } from '@/features/content/services/marketplace-articles.service';

export default async function StoriesPage() {
    const stories = await getMarketplaceArticles();
    return <StorefrontShell>
        <section className="border-b border-border bg-sand/55"><div className="mx-auto max-w-[1340px] px-6 py-14 md:px-12 md:py-20"><p className="eyebrow">The Makers Journal</p><h1 className="mt-3 text-5xl leading-none text-primary md:text-6xl">Stories, guides and local ideas</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Read published stories from our marketplace editorial team.</p></div></section>
        <section className="mx-auto max-w-[1340px] px-6 py-14 md:px-12 md:py-20">
            {stories.length ? <div className="grid gap-5 md:grid-cols-3">{stories.map(story => <Link key={story.id} href={`/stories/${story.slug}`} className="group rounded-2xl border border-border bg-card p-7 shadow-soft"><p className="eyebrow">{story.tags?.[0] ?? 'Story'}</p><h2 className="mt-3 text-[1.8rem] leading-tight text-primary group-hover:text-clay">{story.title}</h2><p className="mt-4 line-clamp-4 text-sm leading-7 text-muted-foreground">{story.excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read story <ArrowRight className="h-4 w-4" /></span></Link>)}</div>
                : <div className="grid min-h-72 place-items-center rounded-2xl border border-border bg-card text-center"><div><BookOpen className="mx-auto h-9 w-9 text-primary/60" /><h2 className="mt-4 text-2xl text-primary">No stories published yet</h2><p className="mt-2 text-sm text-muted-foreground">Published marketplace stories will appear here.</p></div></div>}
        </section>
    </StorefrontShell>;
}
