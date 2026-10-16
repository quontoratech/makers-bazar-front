import { Database } from 'lucide-react';

import { NavigationItem, WorkspaceDefinition } from '@marketplace/contracts';
import { DashboardIcon } from './icon-registry';

export function ModulePage({ definition, item }: { definition: WorkspaceDefinition; item: NavigationItem }) {
    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div>
                <p className="text-xs font-bold uppercase text-[#8c3a18]">{definition.eyebrow}</p>
                <div className="mt-2 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><DashboardIcon name={item.icon} className="size-5" /></span>
                    <h1 className="text-2xl font-bold text-[#222222] sm:text-3xl">{item.label}</h1>
                </div>
            </div>
            <section className="mt-7 grid min-h-72 place-items-center border-y border-[#dbe3df] px-5 py-12 text-center">
                <div><Database className="mx-auto size-10 text-[#8a9b94]" /><h2 className="mt-4 font-bold">No records yet</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#687770]">This section will show records after its live service is connected.</p></div>
            </section>
        </main>
    );
}
