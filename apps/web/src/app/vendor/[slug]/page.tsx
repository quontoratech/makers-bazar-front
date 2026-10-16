import { redirect } from 'next/navigation';

export default async function LegacyVendorPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    redirect(`/vendors/${encodeURIComponent(slug)}`);
}
