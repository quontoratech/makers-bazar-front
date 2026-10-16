import { ArrowRight, CircleAlert, Database, MoreHorizontal } from 'lucide-react';

import { MarketplaceSession, WorkspaceDefinition } from '@marketplace/contracts';
import { Badge, Button, MetricCard, Panel, PanelHeader } from '@marketplace/ui';
import { DashboardIcon } from './icon-registry';

const metricIcons = ['ChartNoAxesCombined', 'Package', 'WalletCards', 'Star'];

export function WorkspaceOverview({ definition, session }: { definition: WorkspaceDefinition; session?: MarketplaceSession }) {
    const firstName = session?.displayName.split(/\s+/)[0];
    const title = definition.role === 'customer' && firstName
        ? `Good morning, ${firstName}`
        : ['vendor', 'influencer', 'organizer'].includes(definition.role) && session?.displayName
            ? session.displayName
            : definition.title;
    const hasMetrics = definition.metrics.length > 0;
    const hasActivity = definition.activity.length > 0;
    const hasQueue = definition.queue.length > 0;
    const hasOverviewData = hasMetrics || hasActivity || hasQueue;
    const showPrimaryAction = !['admin', 'super-admin'].includes(definition.role);
    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">{definition.eyebrow}</p>
                    <h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">{title}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63716c]">{definition.description}</p>
                </div>
                {showPrimaryAction ? <Button className="self-start">
                    <DashboardIcon name={definition.primaryActionIcon} />
                    {definition.primaryAction}
                </Button> : null}
            </div>

            {hasMetrics ? <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {definition.metrics.map((metric, index) => (
                    <MetricCard
                        key={metric.label}
                        {...metric}
                        icon={<DashboardIcon name={metricIcons[index] ?? 'Gauge'} />}
                    />
                ))}
            </div> : null}

            {hasActivity || hasQueue ? <div className={`mt-6 grid gap-5 ${hasActivity && hasQueue ? 'xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)]' : ''}`}>
                {hasActivity ? <Panel className="min-w-0 overflow-hidden rounded-md">
                    <PanelHeader
                        title={definition.activityTitle}
                        description="Updated a few moments ago"
                        action={<Button variant="ghost" size="icon" aria-label="More options" title="More options"><MoreHorizontal className="size-5" /></Button>}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-[#e5ebe8] bg-[#fafbfa]">
                                    {definition.activityColumns.map(column => <th key={column} className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">{column}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {definition.activity.map(row => (
                                    <tr key={row.id} className="border-b border-[#edf1ef] last:border-0 hover:bg-[#fafcfb]">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-[#263830]">{row.primary}</p>
                                            <p className="mt-1 text-xs text-[#7b8983]">{row.id}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{row.secondary}</td>
                                        <td className="px-5 py-4"><Badge tone={row.tone}>{row.status}</Badge></td>
                                        <td className="px-5 py-4 text-sm font-bold text-[#263830]">{row.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end border-t border-[#e5ebe8] px-5 py-3">
                        <Button variant="ghost" size="sm">View all <ArrowRight className="size-4" /></Button>
                    </div>
                </Panel> : null}

                {hasQueue ? <Panel className="overflow-hidden rounded-md">
                    <PanelHeader title={definition.queueTitle} description="Sorted by urgency" />
                    <div className="divide-y divide-[#e7ecea]">
                        {definition.queue.map(item => (
                            <button key={item.label} type="button" className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-[#fafcfb]">
                                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-[#eef3f1] text-[#496059]"><CircleAlert className="size-4" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-[#273a32]">{item.label}</span>
                                    <span className="mt-1 block text-xs leading-5 text-[#74827d]">{item.detail}</span>
                                </span>
                                <Badge tone={item.tone}>{item.value}</Badge>
                            </button>
                        ))}
                    </div>
                </Panel> : null}
            </div> : null}

            {!hasOverviewData ? <section className="mt-7 grid min-h-72 place-items-center border-y border-[#dbe3df] px-5 py-12 text-center"><div><Database className="mx-auto size-10 text-[#8a9b94]" /><h2 className="mt-4 font-bold">No live summary data yet</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#687770]">Use the navigation to open role applications, orders, and other connected admin modules.</p></div></section> : null}
        </main>
    );
}
