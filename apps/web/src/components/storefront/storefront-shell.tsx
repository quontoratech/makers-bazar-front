import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="makers-theme min-h-screen">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
        </div>
    );
}
