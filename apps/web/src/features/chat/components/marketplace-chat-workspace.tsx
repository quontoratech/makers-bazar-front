'use client';

import { ArrowLeft, Calculator, CheckCheck, CircleAlert, Clock3, Download, FileText, ImageIcon, LockKeyhole, MessageSquareText, Paperclip, Plus, RefreshCw, Search, Send, ShieldCheck, ShoppingBag, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { Badge, Button } from '@marketplace/ui';
import { MAX_CHAT_FILES, MAX_CHAT_FILE_SIZE, MAX_CHAT_FILE_SIZE_MB } from '../chat-limits';
import {
    MarketplaceChatAck,
    MarketplaceChatAttachment,
    MarketplaceChatConversation,
    MarketplaceChatConversationList,
    MarketplaceChatMessage,
    MarketplaceChatOrderReceipt,
    MarketplaceChatRole,
    MarketplaceChatSocketTicket,
} from '../types';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';

interface MarketplaceChatWorkspaceProps {
    role: MarketplaceChatRole;
    initialConversations: MarketplaceChatConversationList;
    initialConversationId?: string;
    initialOrderCode?: string;
    loadError?: string;
}

type ConnectionState = 'connecting' | 'live' | 'fallback';

const allowedChatFileTypes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/csv',
    'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.ms-excel',
]);

function dateTime(value: string) {
    return new Date(value).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

function time(value: string) {
    return new Date(value).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function money(value: number, currencyCode = 'PKR') {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency', currency: currencyCode, maximumFractionDigits: value % 100 === 0 ? 0 : 2,
    }).format(value / 100).replace('PKR', 'Rs');
}

function fileSize(value: number) {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function senderRole(role: MarketplaceChatRole) {
    return role.replace('-', '_').toUpperCase();
}

function appendMessage(messages: MarketplaceChatMessage[], incoming: MarketplaceChatMessage) {
    const existingIndex = messages.findIndex(message => message.id === incoming.id
        || (message.clientMessageId && message.clientMessageId === incoming.clientMessageId));
    if (existingIndex >= 0) return messages.map((message, index) => index === existingIndex ? incoming : message);
    return [...messages, incoming].sort((left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function messagesForDisplay(conversation: MarketplaceChatConversation) {
    if (conversation.conversationType !== 'ORDER') return conversation.messages;
    return [...conversation.messages].sort((left, right) => {
        const priority = (message: MarketplaceChatMessage) => {
            if (message.kind === 'ORDER_SUMMARY' && message.orderReceipt) return 0;
            if (message.kind === 'AUTOMATED_GREETING') return 1;
            return 2;
        };
        const priorityDifference = priority(left) - priority(right);
        if (priorityDifference) return priorityDifference;
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
}

export function MarketplaceChatWorkspace({
    role,
    initialConversations,
    initialConversationId,
    initialOrderCode,
    loadError,
}: MarketplaceChatWorkspaceProps) {
    const initialSelected = initialConversationId && initialConversations.items.some(item => item.id === initialConversationId)
        ? initialConversationId
        : initialOrderCode
            ? initialConversations.items.find(item => item.sellerOrderCode === initialOrderCode || item.customerOrderCode === initialOrderCode)?.id
            : initialConversations.items[0]?.id;
    const [conversations, setConversations] = useState(initialConversations.items);
    const [selectedId, setSelectedId] = useState(initialSelected);
    const [active, setActive] = useState<MarketplaceChatConversation>();
    const [term, setTerm] = useState('');
    const [draft, setDraft] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const [loadingConversation, setLoadingConversation] = useState(Boolean(initialSelected));
    const [sending, setSending] = useState(false);
    const [workspaceHeight, setWorkspaceHeight] = useState<number>();
    const [message, setMessage] = useState(loadError ?? '');
    const socketRef = useRef<Socket | undefined>(undefined);
    const selectedRef = useRef(selectedId);
    const previousRoomRef = useRef<string | undefined>(undefined);
    const messageScrollRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<HTMLElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pendingPreviews = useMemo(() => pendingFiles.map(file => ({
        file,
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    })), [pendingFiles]);
    const displayedMessages = useMemo(() => active ? messagesForDisplay(active) : [], [active]);

    useEffect(() => () => {
        for (const preview of pendingPreviews) if (preview.url) URL.revokeObjectURL(preview.url);
    }, [pendingPreviews]);

    useLayoutEffect(() => {
        const updateHeight = () => {
            const top = workspaceRef.current?.getBoundingClientRect().top ?? 64;
            setWorkspaceHeight(Math.max(320, Math.floor(window.innerHeight - top - 16)));
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        const observer = new ResizeObserver(updateHeight);
        observer.observe(document.body);
        if (workspaceRef.current?.parentElement) observer.observe(workspaceRef.current.parentElement);
        return () => {
            window.removeEventListener('resize', updateHeight);
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        selectedRef.current = selectedId;
        setPendingFiles([]);
    }, [selectedId]);

    const refreshList = useCallback(async () => {
        try {
            const response = await fetch('/api/chat', { cache: 'no-store' });
            const result = await response.json() as MarketplaceChatConversationList & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to refresh conversations');
            setConversations(result.items);
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to refresh conversations');
        }
    }, []);

    const loadConversation = useCallback(async (conversationId: string) => {
        setLoadingConversation(true);
        try {
            const response = await fetch(`/api/chat?id=${encodeURIComponent(conversationId)}`, { cache: 'no-store' });
            const result = await response.json() as MarketplaceChatConversation & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to open conversation');
            setActive(result);
            setConversations(current => current.map(item => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
            await fetch('/api/chat', {
                method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conversationId }),
            });
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to open conversation');
        } finally {
            setLoadingConversation(false);
        }
    }, []);

    useEffect(() => {
        let disposed = false;
        let initialTicket: MarketplaceChatSocketTicket | undefined;
        async function fetchTicket() {
            const response = await fetch('/api/chat/socket-ticket', { cache: 'no-store' });
            const result = await response.json() as MarketplaceChatSocketTicket & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to authenticate live chat');
            return result;
        }
        async function connect() {
            try {
                initialTicket = await fetchTicket();
                if (disposed) return;
                const socket = io(`${initialTicket.socketUrl}/marketplace-chat`, {
                    transports: ['websocket', 'polling'],
                    withCredentials: true,
                    auth: callback => {
                        if (initialTicket) {
                            const current = initialTicket;
                            initialTicket = undefined;
                            callback({ ticket: current.token });
                            return;
                        }
                        void fetchTicket()
                            .then(ticket => callback({ ticket: ticket.token }))
                            .catch(() => callback({ ticket: '' }));
                    },
                });
                socketRef.current = socket;
                socket.on('chat:ready', () => {
                    setConnection('live');
                    const conversationId = selectedRef.current;
                    if (conversationId) {
                        socket.emit('chat:join', { conversationId }, (ack: MarketplaceChatAck<MarketplaceChatConversation>) => {
                            if (ack.ok && ack.data) setActive(ack.data);
                        });
                    }
                });
                socket.on('disconnect', () => setConnection('connecting'));
                socket.on('connect_error', () => setConnection('fallback'));
                socket.on('chat:error', (payload: { message?: string }) => {
                    setConnection('fallback');
                    if (payload.message) setMessage(payload.message);
                });
                socket.on('chat:message', (payload: { conversationId: string; message: MarketplaceChatMessage }) => {
                    if (selectedRef.current === payload.conversationId) {
                        setActive(current => current
                            ? { ...current, messages: appendMessage(current.messages, payload.message) }
                            : current);
                        socket.emit('chat:read', { conversationId: payload.conversationId });
                    }
                    void refreshList();
                });
                socket.on('chat:conversation-updated', () => void refreshList());
            } catch (error) {
                setConnection('fallback');
                setMessage(error instanceof Error ? error.message : 'Live chat is unavailable; messages will use secure fallback delivery');
            }
        }
        void connect();
        return () => {
            disposed = true;
            socketRef.current?.disconnect();
            socketRef.current = undefined;
        };
    }, [refreshList]);

    useEffect(() => {
        if (!selectedId) {
            setActive(undefined);
            return;
        }
        const socket = socketRef.current;
        if (socket?.connected) {
            if (previousRoomRef.current && previousRoomRef.current !== selectedId) {
                socket.emit('chat:leave', { conversationId: previousRoomRef.current });
            }
            previousRoomRef.current = selectedId;
            setLoadingConversation(true);
            socket.emit('chat:join', { conversationId: selectedId }, (ack: MarketplaceChatAck<MarketplaceChatConversation>) => {
                if (ack.ok && ack.data) {
                    setActive(ack.data);
                    setConversations(current => current.map(item => item.id === selectedId ? { ...item, unreadCount: 0 } : item));
                    setMessage('');
                } else {
                    setMessage(ack.message ?? 'Unable to open conversation');
                }
                setLoadingConversation(false);
            });
        } else {
            void loadConversation(selectedId);
        }
    }, [selectedId, loadConversation]);

    useEffect(() => {
        const messagePane = messageScrollRef.current;
        if (!messagePane) return;
        messagePane.scrollTo({ top: messagePane.scrollHeight, behavior: 'smooth' });
    }, [active?.messages.length]);

    const filtered = useMemo(() => {
        const search = term.trim().toLowerCase();
        if (!search) return conversations;
        return conversations.filter(item => [
            item.customerName, item.customerEmail, item.vendorName, item.customerOrderCode, item.sellerOrderCode, item.sourceCode,
        ].some(value => value?.toLowerCase().includes(search)));
    }, [conversations, term]);

    function chooseFiles(fileList: FileList | null) {
        const incoming = Array.from(fileList ?? []);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!incoming.length) return;
        const combined = [...pendingFiles];
        for (const file of incoming) {
            if (!allowedChatFileTypes.has(file.type)) {
                setMessage(`${file.name} is not an allowed image or document type`);
                return;
            }
            if (!file.size) {
                setMessage(`${file.name} is empty`);
                return;
            }
            if (file.size > MAX_CHAT_FILE_SIZE) {
                setMessage(`${file.name} is larger than ${MAX_CHAT_FILE_SIZE_MB} MB`);
                return;
            }
            if (!combined.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
                combined.push(file);
            }
        }
        if (combined.length > MAX_CHAT_FILES) {
            setMessage(`Attach no more than ${MAX_CHAT_FILES} files to one message`);
            return;
        }
        setPendingFiles(combined);
        setMessage('');
    }

    async function uploadPendingFiles(conversationId: string) {
        if (!pendingFiles.length) return [] as MarketplaceChatAttachment[];
        const form = new FormData();
        form.set('conversationId', conversationId);
        pendingFiles.forEach(file => form.append('files', file, file.name));
        const response = await fetch('/api/chat/attachments', { method: 'POST', body: form });
        const result = await response.json() as MarketplaceChatAttachment[] & { message?: string };
        if (!response.ok) throw new Error(result.message ?? 'Attachment upload failed');
        return result;
    }

    async function send() {
        const body = draft.trim();
        if ((!body && !pendingFiles.length) || !selectedId || sending || active?.status !== 'OPEN') return;
        setSending(true);
        try {
            const uploaded = await uploadPendingFiles(selectedId);
            const input = {
                conversationId: selectedId,
                body,
                clientMessageId: crypto.randomUUID(),
                attachmentIds: uploaded.map(item => item.id),
            };
            const socket = socketRef.current;
            let sent: MarketplaceChatMessage;
            if (socket?.connected) {
                sent = await new Promise((resolve, reject) => {
                    socket.emit('chat:send', input, (ack: MarketplaceChatAck<MarketplaceChatMessage>) => {
                        if (ack.ok && ack.data) resolve(ack.data);
                        else reject(new Error(ack.message ?? 'Unable to send message'));
                    });
                });
            } else {
                const response = await fetch('/api/chat', {
                    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
                });
                const result = await response.json() as MarketplaceChatMessage & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to send message');
                sent = result;
            }
            setActive(current => current ? { ...current, messages: appendMessage(current.messages, sent) } : current);
            setDraft('');
            setPendingFiles([]);
            setMessage('');
            await refreshList();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to send message');
        } finally {
            setSending(false);
        }
    }

    const isAdmin = role === 'admin' || role === 'super-admin';
    const activeTitle = active?.conversationType === 'ORDER'
        ? role === 'customer' ? active.vendorName : active.customerName
        : active?.conversationType === 'LISTING_INQUIRY'
            ? role === 'customer' ? active.vendorName : active?.customerName
        : isAdmin
            ? active?.conversationType === 'VENDOR_APPEAL' ? active.vendorName : active?.customerName
            : 'Marketplace support';
    const activeContext = active?.conversationType === 'ORDER'
        ? `Order ${active.customerOrderCode} | Seller ${active.sellerOrderCode}`
        : active?.conversationType === 'LISTING_INQUIRY'
            ? `Event inquiry | ${active.sourceCode ?? 'Custom event service'}`
            : `${active?.conversationType === 'VENDOR_APPEAL' ? 'Vendor appeal' : 'Customer appeal'} | ${active?.sourceCode ?? 'Approved case'}`;

    return (
        <main
            ref={workspaceRef}
            style={workspaceHeight ? { height: `${workspaceHeight}px` } : undefined}
            className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden pb-4"
        >
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase text-[#8c3a18]">{isAdmin ? 'Marketplace oversight' : role === 'vendor' ? 'Vendor workspace' : 'Customer account'}</p>
                    <h1 className="mt-2 text-3xl font-black text-[#17251f]">Messages</h1>
                    <p className="mt-2 text-sm text-[#687770]">Order conversations and approved marketplace support channels.</p>
                </div>
                <Button variant="secondary" onClick={() => void refreshList()}><RefreshCw className="size-4" /> Refresh</Button>
            </div>

            {message ? <div className="mt-5 flex shrink-0 items-start gap-3 border border-[#e7b9ae] bg-[#fff4f1] px-4 py-3 text-sm font-semibold text-[#a74433]"><CircleAlert className="mt-0.5 size-4 shrink-0" />{message}</div> : null}

            <section className="mt-6 grid min-h-0 flex-1 overflow-hidden border-y border-[#dbe3df] bg-white lg:grid-cols-[360px_minmax(0,1fr)]">
                <aside className={`${selectedId ? 'hidden lg:flex' : 'flex'} h-full min-h-0 flex-col overflow-hidden border-[#dbe3df] lg:border-r`}>
                    <div className="shrink-0 border-b border-[#e2e8e5] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div><h2 className="font-black text-[#203129]">Conversations</h2><p className="mt-1 text-xs text-[#718079]">{conversations.length} channel{conversations.length === 1 ? '' : 's'}</p></div>
                            {conversations.some(item => item.unreadCount > 0) ? <Badge tone="warning">{conversations.filter(item => item.unreadCount > 0).length} unread</Badge> : null}
                        </div>
                        <label className="mt-4 flex h-10 items-center gap-2 border border-[#ccd8d2] px-3 focus-within:border-[#255038]">
                            <Search className="size-4 text-[#718079]" />
                            <input value={term} onChange={event => setTerm(event.target.value)} placeholder="Customer, vendor, or order" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                        </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        {filtered.length ? filtered.map(conversation => {
                            const primary = role === 'customer'
                                ? conversation.vendorName
                                : role === 'vendor'
                                    ? conversation.customerName
                                    : conversation.conversationType === 'VENDOR_APPEAL'
                                        ? conversation.vendorName
                                        : conversation.customerName;
                            const secondary = isAdmin
                                ? conversation.conversationType === 'ORDER'
                                    ? `${conversation.vendorName} | ${conversation.customerEmail}`
                                    : conversation.conversationType === 'LISTING_INQUIRY'
                                        ? `Event inquiry | ${conversation.sourceCode}`
                                        : `${conversation.conversationType === 'VENDOR_APPEAL' ? 'Vendor' : 'Customer'} appeal | ${conversation.sourceCode}`
                                : conversation.conversationType === 'ORDER'
                                    ? conversation.customerOrderCode
                                    : conversation.conversationType === 'LISTING_INQUIRY'
                                        ? `Event inquiry | ${conversation.sourceCode}`
                                        : `Marketplace appeal | ${conversation.sourceCode}`;
                            return (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    onClick={() => setSelectedId(conversation.id)}
                                    className={`relative block w-full border-b border-[#e7ece9] px-4 py-4 text-left hover:bg-[#f4f8f6] ${selectedId === conversation.id ? 'bg-[#edf6f2]' : 'bg-white'}`}
                                >
                                    {conversation.unreadCount ? <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#8c3a18]" /> : null}
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="min-w-0"><span className="block truncate text-sm font-black text-[#203129]">{primary}</span><span className="mt-1 block truncate text-xs text-[#6d7b75]">{secondary}</span></span>
                                        <span className="shrink-0 text-[11px] font-semibold text-[#85918c]">{dateTime(conversation.lastMessageAt)}</span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <p className={`min-w-0 flex-1 truncate text-xs ${conversation.unreadCount ? 'font-bold text-[#40534b]' : 'text-[#718079]'}`}>{conversation.lastMessagePreview}</p>
                                        {conversation.status === 'CLOSED' ? <LockKeyhole className="size-3.5 shrink-0 text-[#87938e]" /> : null}
                                        {conversation.unreadCount ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#8c3a18] text-[10px] font-black text-white">{conversation.unreadCount}</span> : null}
                                    </div>
                                </button>
                            );
                        }) : <EmptyConversations hasSearch={Boolean(term)} />}
                    </div>
                </aside>

                <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} h-full min-h-0 min-w-0 flex-col overflow-hidden`}>
                    {active ? (
                        <>
                            <header className="flex min-h-[78px] shrink-0 items-center justify-between gap-4 border-b border-[#e2e8e5] px-4 py-3 sm:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <button type="button" onClick={() => setSelectedId(undefined)} title="Back to conversations" className="grid size-9 shrink-0 place-items-center text-[#40534b] hover:bg-[#edf4f1] lg:hidden"><ArrowLeft className="size-5" /></button>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="truncate font-black text-[#203129]">{activeTitle}</h2>
                                            {isAdmin ? <Badge tone="info">Admin oversight</Badge> : null}
                                            {active.conversationType === 'LISTING_INQUIRY' ? <Badge tone="info">Event inquiry</Badge> : active.conversationType !== 'ORDER' ? <Badge tone="warning">Approved appeal</Badge> : null}
                                            {active.status === 'CLOSED' ? <Badge tone="neutral">Closed</Badge> : null}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-[#718079]">{activeContext}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-[#5d6e66]">
                                    <span className={`size-2 rounded-full ${connection === 'live' ? 'bg-[#2f8a66]' : connection === 'connecting' ? 'bg-[#d79b25]' : 'bg-[#87958f]'}`} />
                                    <span className="hidden sm:inline">{connection === 'live' ? 'Live' : connection === 'connecting' ? 'Connecting' : 'Secure fallback'}</span>
                                </div>
                            </header>

                            {isAdmin ? <div className="flex shrink-0 items-center gap-2 border-b border-[#dce6e1] bg-[#f2f7f5] px-5 py-2.5 text-xs font-semibold text-[#426057]"><ShieldCheck className="size-4" />Messages are visible to marketplace administration and retained with the related order or case audit record.</div> : null}

                            <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f8faf9] px-4 py-5 sm:px-6">
                                <div className="mx-auto max-w-4xl space-y-4">
                                    {displayedMessages.map(chatMessage => <ChatMessageBubble key={chatMessage.id} message={chatMessage} role={role} conversation={active} />)}
                                </div>
                            </div>

                            {active.status === 'CLOSED' ? (
                                <div className="shrink-0 border-t border-[#dce4e0] bg-white px-4 pb-7 pt-4 sm:px-5 sm:pb-8">
                                    <div className="mx-auto flex max-w-4xl items-start gap-3 border border-[#d5dfda] bg-[#f4f7f5] px-4 py-3 text-sm text-[#56675f]">
                                        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                                        <div><p className="font-black text-[#30443b]">This conversation is closed</p><p className="mt-1 text-xs leading-5">{active.closedReason ?? 'The messaging period has ended.'} Messages and files remain available for the audit record.</p></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-h-[75%] min-h-0 shrink-0 overflow-y-auto overscroll-contain border-t border-[#dce4e0] bg-white px-3 pb-7 pt-3 sm:px-5 sm:pb-8 sm:pt-4">
                                    <div className="mx-auto max-w-4xl">
                                        {role === 'vendor' && active.conversationType === 'LISTING_INQUIRY' ? <VendorQuoteComposer conversationId={active.id} onSent={sent => { setActive(current => current ? { ...current, messages: appendMessage(current.messages, sent) } : current); void refreshList(); }} /> : null}
                                        {pendingPreviews.length ? (
                                            <div className="mb-3 flex max-h-28 gap-2 overflow-x-auto pb-1">
                                                {pendingPreviews.map(({ file, url }, index) => (
                                                    <div key={`${file.name}-${file.lastModified}`} className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden border border-[#cbd7d1] bg-[#f2f6f4]">
                                                        {url ? <img src={url} alt={file.name} className="size-full object-cover" /> : <div className="min-w-0 px-2 text-center"><FileText className="mx-auto size-5 text-[#416357]" /><p className="mt-1 truncate text-[10px] font-bold text-[#40534b]">{file.name}</p><p className="text-[9px] text-[#7b8983]">{fileSize(file.size)}</p></div>}
                                                        <button type="button" onClick={() => setPendingFiles(current => current.filter((_, itemIndex) => itemIndex !== index))} title={`Remove ${file.name}`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[#17251f]/85 text-white hover:bg-[#a74433]"><X className="size-3.5" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        <div className="flex items-end gap-2">
                                            <input ref={fileInputRef} type="file" multiple accept={Array.from(allowedChatFileTypes).join(',')} className="sr-only" onChange={event => chooseFiles(event.target.files)} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || pendingFiles.length >= MAX_CHAT_FILES} title={`Attach images or documents, up to ${MAX_CHAT_FILE_SIZE_MB} MB each`} className="grid size-12 shrink-0 place-items-center border border-[#cbd7d1] text-[#315f51] hover:bg-[#eef5f2] disabled:cursor-not-allowed disabled:text-[#9aaaa3]"><Paperclip className="size-5" /></button>
                                            <textarea
                                                value={draft}
                                                onChange={event => setDraft(event.target.value)}
                                                onKeyDown={event => {
                                                    if (event.key === 'Enter' && !event.shiftKey) {
                                                        event.preventDefault();
                                                        void send();
                                                    }
                                                }}
                                                rows={2}
                                                maxLength={2000}
                                                placeholder="Write a message"
                                                className="min-h-[52px] flex-1 resize-none border border-[#cbd7d1] px-3 py-3 text-sm outline-none focus:border-[#255038]"
                                            />
                                            <button type="button" onClick={() => void send()} disabled={(!draft.trim() && !pendingFiles.length) || sending} title="Send message" className="grid size-12 shrink-0 place-items-center bg-[#164c3f] text-white hover:bg-[#0f3e33] disabled:cursor-not-allowed disabled:bg-[#98aaa3]"><Send className="size-5" /></button>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap justify-between gap-1 text-[11px] text-[#87938e]"><span>{sending ? 'Uploading and sending securely' : `Up to ${MAX_CHAT_FILES} files, ${MAX_CHAT_FILE_SIZE_MB} MB each`}</span><span>{active.closeAt ? `Open until ${dateTime(active.closeAt)} | ` : ''}{draft.length}/2000</span></div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : loadingConversation ? <div className="grid flex-1 place-items-center text-sm font-semibold text-[#718079]"><RefreshCw className="mr-2 inline size-4 animate-spin" />Opening conversation</div> : <EmptyChat />}
                </div>
            </section>
        </main>
    );
}

function ChatMessageBubble({ message, role, conversation }: { message: MarketplaceChatMessage; role: MarketplaceChatRole; conversation: MarketplaceChatConversation }) {
    if (message.kind === 'ORDER_SUMMARY' && message.orderReceipt) {
        return <OrderReceipt receipt={message.orderReceipt} role={role} conversation={conversation} sentAt={message.createdAt} />;
    }
    if (message.kind === 'APPEAL_SUMMARY' && message.appealSummary) {
        return <AppealSummary summary={message.appealSummary} sentAt={message.createdAt} />;
    }
    if (message.kind === 'INQUIRY_SUMMARY' && message.inquirySummary) {
        return <InquirySummary summary={message.inquirySummary} sentAt={message.createdAt} />;
    }
    if (message.kind === 'QUOTE' && message.quote) {
        return <QuoteSummary quote={message.quote} role={role} sentAt={message.createdAt} />;
    }
    if (message.kind === 'ORDER_STATUS') {
        return <div className="mx-auto max-w-xl border-y border-[#d9e3de] bg-white px-4 py-3 text-center"><p className="text-xs font-black uppercase text-[#47655b]">Order update</p><p className="mt-1 text-sm text-[#40534b]">{message.body}</p><p className="mt-1 text-[11px] text-[#87938e]">{dateTime(message.createdAt)}</p></div>;
    }
    const own = message.senderRole === senderRole(role);
    return (
        <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] px-3.5 py-2.5 ${own ? 'bg-[#164c3f] text-white' : message.senderRole === 'ADMIN' || message.senderRole === 'SUPER_ADMIN' ? 'border border-[#b9d4e2] bg-[#eef7fb] text-[#203b49]' : 'border border-[#d9e2de] bg-white text-[#30443b]'}`}>
                <div className="flex items-center gap-2 text-[11px] font-bold"><span>{message.senderName}</span>{message.automated ? <span className="uppercase opacity-70">Automated</span> : null}</div>
                {message.body ? <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p> : null}
                {message.attachments.length ? <ChatAttachments attachments={message.attachments} own={own} /> : null}
                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? 'text-white/70' : 'text-[#87938e]'}`}>{time(message.createdAt)}{own ? <CheckCheck className="size-3" /> : null}</div>
            </div>
        </div>
    );
}

function ChatAttachments({ attachments, own }: { attachments: MarketplaceChatAttachment[]; own: boolean }) {
    return (
        <div className={`mt-2 grid gap-2 ${attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {attachments.map(attachment => attachment.isImage ? (
                <a key={attachment.id} href={attachment.downloadUrl} target="_blank" rel="noreferrer" className={`group relative block min-w-0 overflow-hidden border ${own ? 'border-white/30' : 'border-[#d3ddd8]'}`}>
                    <img src={attachment.downloadUrl} alt={attachment.name} className="h-36 w-full min-w-[150px] object-cover sm:h-44" />
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-[#17251f]/80 px-2 py-1.5 text-[10px] font-bold text-white"><ImageIcon className="size-3" /><span className="min-w-0 flex-1 truncate">{attachment.name}</span><Download className="size-3" /></span>
                </a>
            ) : (
                <a key={attachment.id} href={attachment.downloadUrl} download className={`flex min-w-[190px] items-center gap-2 border px-3 py-2.5 ${own ? 'border-white/30 bg-white/10 text-white' : 'border-[#d3ddd8] bg-[#f6f8f7] text-[#30443b]'}`}>
                    <FileText className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{attachment.name}</span><span className={`mt-0.5 block text-[10px] ${own ? 'text-white/70' : 'text-[#7b8983]'}`}>{fileSize(attachment.size)}</span></span>
                    <Download className="size-4 shrink-0" />
                </a>
            ))}
        </div>
    );
}

function AppealSummary({ summary, sentAt }: { summary: NonNullable<MarketplaceChatMessage['appealSummary']>; sentAt: string }) {
    return (
        <section className="mx-auto max-w-2xl border border-[#b9d4e2] bg-white">
            <header className="flex items-start justify-between gap-4 border-b border-[#d7e4ea] bg-[#f0f7fa] px-4 py-4 sm:px-5">
                <div><p className="text-xs font-black uppercase text-[#35657b]">Approved marketplace appeal</p><h3 className="mt-1 font-black text-[#203129]">{summary.subject}</h3><p className="mt-1 text-xs text-[#718079]">Reference {summary.reference}</p></div>
                <ShieldCheck className="size-6 shrink-0 text-[#35657b]" />
            </header>
            <div className="px-4 py-4 sm:px-5">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{summary.statement}</p>
                {summary.adminNote ? <div className="mt-4 border-l-2 border-[#35657b] bg-[#f5f9fb] px-3 py-2 text-sm text-[#405b67]"><strong>Admin review:</strong> {summary.adminNote}</div> : null}
                {summary.evidence.length ? (
                    <div className="mt-4">
                        <p className="text-xs font-black uppercase text-[#718079]">Submitted proof</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {summary.evidence.map(item => {
                                const source = resolveCatalogAssetUrl(item.preview);
                                const isImage = item.mimeType.startsWith('image/');
                                return <a key={item.id} href={source} target="_blank" rel="noreferrer" className="flex min-h-24 min-w-0 items-center justify-center overflow-hidden border border-[#d8e1dd] bg-[#f2f5f3]">{isImage ? <img src={source} alt={item.name} className="h-28 w-full object-cover" /> : <span className="min-w-0 px-3 text-center"><FileText className="mx-auto size-6 text-[#416357]" /><span className="mt-2 block truncate text-xs font-bold text-[#40534b]">{item.name}</span></span>}</a>;
                            })}
                        </div>
                    </div>
                ) : <p className="mt-4 text-xs text-[#718079]">No files were submitted with this appeal.</p>}
            </div>
            <footer className="flex items-center gap-2 border-t border-[#d7e4ea] px-4 py-3 text-[11px] text-[#718079] sm:px-5"><Clock3 className="size-3.5" />Support channel opened {dateTime(sentAt)}</footer>
        </section>
    );
}

function OrderReceipt({ receipt, role, conversation, sentAt }: { receipt: MarketplaceChatOrderReceipt; role: MarketplaceChatRole; conversation: MarketplaceChatConversation; sentAt: string }) {
    const orderHref = `/dashboard/${role}/orders?order=${encodeURIComponent(receipt.customerOrderCode)}`;
    return (
        <section className="mx-auto max-w-2xl border border-[#cad8d1] bg-white">
            <header className="flex items-start justify-between gap-4 border-b border-[#dce5e1] px-4 py-4 sm:px-5">
                <div><p className="text-xs font-black uppercase text-[#8c3a18]">Order receipt</p><h3 className="mt-1 font-black text-[#203129]">{receipt.customerOrderCode}</h3><p className="mt-1 text-xs text-[#718079]">Seller order {receipt.sellerOrderCode} | {dateTime(receipt.placedAt)}</p></div>
                <ShoppingBag className="size-6 text-[#255038]" />
            </header>
            <div className="divide-y divide-[#e5ebe8] px-4 sm:px-5">
                {receipt.lines.map(line => (
                    <div key={line.orderLineId} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                        <div><p className="font-bold text-[#263830]">{line.productName}</p><p className="mt-1 text-xs text-[#718079]">{line.variantName} | SKU {line.sku} | {line.quantity} x {money(line.unitPrice, receipt.currencyCode)}</p></div>
                        <p className="font-black text-[#263830]">{money(line.lineTotal, receipt.currencyCode)}</p>
                    </div>
                ))}
            </div>
            <div className="border-t border-[#dce5e1] px-4 py-4 text-sm sm:px-5">
                <ReceiptRow label="Items before discount" value={money(receipt.itemsBeforeDiscount, receipt.currencyCode)} />
                {receipt.discount > 0 ? <ReceiptRow label="Product discount" value={`-${money(receipt.discount, receipt.currencyCode)}`} accent /> : null}
                <ReceiptRow label="Products subtotal" value={money(receipt.productSubtotal, receipt.currencyCode)} />
                {receipt.rewardFunding > 0 ? <ReceiptRow label={`Marketplace coins (${receipt.rewardCoins})`} value={`-${money(receipt.rewardFunding, receipt.currencyCode)}`} accent /> : null}
                {receipt.couponDiscount > 0 ? <ReceiptRow label={`Coupon (${receipt.couponCode})`} value={`-${money(receipt.couponDiscount, receipt.currencyCode)}`} accent /> : null}
                {receipt.rewardFunding > 0 || receipt.couponDiscount > 0 ? <ReceiptRow label="Customer cash for products" value={money(receipt.customerFundedProductAmount, receipt.currencyCode)} /> : null}
                <ReceiptRow label="Shipping" value={money(receipt.shipping, receipt.currencyCode)} />
                <ReceiptRow label="Tax included" value={money(receipt.taxIncluded, receipt.currencyCode)} />
                <div className="mt-3 flex items-center justify-between border-t border-[#cdd9d3] pt-3 text-base font-black text-[#17251f]"><span>Order value</span><span>{money(receipt.orderTotal, receipt.currencyCode)}</span></div>
                {receipt.rewardFunding > 0 || receipt.couponDiscount > 0 ? <div className="mt-2 flex items-center justify-between text-sm font-black text-[#255038]"><span>Customer cash paid</span><span>{money(receipt.customerPaidTotal, receipt.currencyCode)}</span></div> : null}
                {receipt.rewardFunding > 0 ? <p className="mt-3 bg-[#edf6f2] px-3 py-2 text-xs leading-5 text-[#426057]">The marketplace funds {money(receipt.rewardFunding, receipt.currencyCode)} in redeemed coins, so the vendor order value remains {money(receipt.orderTotal, receipt.currencyCode)}.</p> : null}
                {receipt.couponDiscount > 0 ? <p className="mt-3 bg-[#edf6f2] px-3 py-2 text-xs leading-5 text-[#426057]">Coupon {receipt.couponCode} is {receipt.couponFundingSource?.toLowerCase()} funded. {receipt.couponFundingSource === 'MARKETPLACE' ? 'The vendor receives the full product value before commission.' : 'The vendor discount and commission base are reduced by this amount.'}</p> : null}
            </div>
            <footer className="flex items-center justify-between gap-4 border-t border-[#dce5e1] px-4 py-3 sm:px-5"><p className="text-[11px] text-[#87938e]">Shared automatically {dateTime(sentAt)}</p><Link href={orderHref} className="text-xs font-black text-[#255038] hover:text-[#8c3a18]">View order</Link></footer>
        </section>
    );
}

function ReceiptRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    return <div className="flex items-center justify-between gap-4 py-1.5"><span className="text-[#687770]">{label}</span><span className={`font-bold ${accent ? 'text-[#8c3a18]' : 'text-[#30443b]'}`}>{value}</span></div>;
}

function InquirySummary({ summary, sentAt }: { summary: NonNullable<MarketplaceChatMessage['inquirySummary']>; sentAt: string }) {
    if (summary.inquiryType === 'DIGITAL_PROJECT') {
        const rows = [
            ['Project type', summary.projectType],
            ['Deadline', summary.deadline ? new Date(`${summary.deadline}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : ''],
            ['Brand', summary.brandName],
            ['Target audience', summary.targetAudience],
            ['Initial concepts', summary.conceptCount ? String(summary.conceptCount) : ''],
            ['Revision rounds', summary.revisionRounds != null ? String(summary.revisionRounds) : ''],
            ['Colour theme', summary.colorTheme],
            ['Style', summary.stylePreferences],
            ['Size or dimensions', summary.dimensions],
            ['Final formats', summary.fileFormats?.join(', ')],
            ['Content', summary.contentStatus],
            ['Usage', summary.usageType],
            ['Budget', summary.budget ? money(summary.budget) : 'Open to vendor guidance'],
            ['Confidentiality', summary.ndaRequired ? 'NDA requested' : 'Standard handling'],
        ].filter((row): row is [string, string] => Boolean(row[1]));
        return <section className="mx-auto max-w-2xl border border-[#cad8d1] bg-white"><header className="flex items-start justify-between gap-4 border-b border-[#dce5e1] bg-[#f1f7f4] px-4 py-4 sm:px-5"><div><p className="text-xs font-black uppercase text-[#255038]">Digital project brief</p><h3 className="mt-1 font-black text-[#203129]">{summary.projectTitle || summary.productName}</h3><p className="mt-1 text-xs text-[#718079]">{summary.productName} | {summary.categoryName}</p></div><MessageSquareText className="size-6 shrink-0 text-[#255038]" /></header><dl className="grid gap-px bg-[#e5ebe8] sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="bg-white px-4 py-3"><dt className="text-[11px] font-black uppercase text-[#718079]">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-bold text-[#30443b]">{value}</dd></div>)}</dl>{summary.projectGoal ? <div className="border-t border-[#dce5e1] px-4 py-4 sm:px-5"><p className="text-[11px] font-black uppercase text-[#718079]">Project goal</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{summary.projectGoal}</p></div> : null}{summary.conceptNotes ? <div className="border-t border-[#dce5e1] px-4 py-4 sm:px-5"><p className="text-[11px] font-black uppercase text-[#718079]">Concept direction</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{summary.conceptNotes}</p></div> : null}<div className="border-t border-[#dce5e1] px-4 py-4 sm:px-5"><p className="text-[11px] font-black uppercase text-[#718079]">Detailed requirements</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{summary.details}</p>{summary.referenceLinks?.length ? <div className="mt-3 space-y-1">{summary.referenceLinks.map(link => <a key={link} href={link} target="_blank" rel="noreferrer" className="block truncate text-xs font-bold text-[#255038] hover:underline">{link}</a>)}</div> : null}</div><footer className="flex items-center gap-2 border-t border-[#dce5e1] px-4 py-3 text-[11px] text-[#718079] sm:px-5"><Clock3 className="size-3.5" />Brief submitted {dateTime(sentAt)}</footer></section>;
    }
    const rows = [
        ['Event type', summary.eventType],
        ['Date', summary.eventDate ? new Date(`${summary.eventDate}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : ''],
        ['Time', [summary.startTime, summary.endTime].filter(Boolean).join(' to ')],
        ['Guests', summary.guestCount?.toLocaleString('en-PK')],
        ['Location', [summary.venue, summary.city].filter(Boolean).join(', ')],
        ['Budget', summary.budget ? money(summary.budget) : 'Open to vendor guidance'],
        ['Theme or colours', summary.theme],
    ].filter((row): row is [string, string] => Boolean(row[1]));
    return <section className="mx-auto max-w-2xl border border-[#cad8d1] bg-white"><header className="flex items-start justify-between gap-4 border-b border-[#dce5e1] bg-[#f1f7f4] px-4 py-4 sm:px-5"><div><p className="text-xs font-black uppercase text-[#255038]">Event requirements</p><h3 className="mt-1 font-black text-[#203129]">{summary.productName}</h3><p className="mt-1 text-xs text-[#718079]">{summary.categoryName}</p></div><MessageSquareText className="size-6 shrink-0 text-[#255038]" /></header><dl className="grid gap-px bg-[#e5ebe8] sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="bg-white px-4 py-3"><dt className="text-[11px] font-black uppercase text-[#718079]">{label}</dt><dd className="mt-1 text-sm font-bold text-[#30443b]">{value}</dd></div>)}</dl><div className="border-t border-[#dce5e1] px-4 py-4 sm:px-5"><p className="text-[11px] font-black uppercase text-[#718079]">Customer notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{summary.details}</p></div><footer className="flex items-center gap-2 border-t border-[#dce5e1] px-4 py-3 text-[11px] text-[#718079] sm:px-5"><Clock3 className="size-3.5" />Inquiry submitted {dateTime(sentAt)}</footer></section>;
}

function QuoteSummary({ quote, role, sentAt }: { quote: NonNullable<MarketplaceChatMessage['quote']>; role: MarketplaceChatRole; sentAt: string }) {
    const payable = quote.status === 'SENT' && new Date(quote.validUntil).getTime() > Date.now();
    const addOns = quote.addOns ?? [];
    const addOnTotal = addOns.reduce((total, item) => total + item.price, 0);
    return <section className="mx-auto max-w-2xl border border-[#c9d7d1] bg-white"><header className="flex items-start justify-between gap-4 border-b border-[#dce5e1] px-4 py-4 sm:px-5"><div><p className="text-xs font-black uppercase text-[#8c3a18]">Personalized quotation</p><h3 className="mt-1 text-xl font-black text-[#255038]">{money(quote.amount, quote.currencyCode)}</h3><p className="mt-1 text-xs text-[#718079]">{quote.code} | Valid until {new Date(quote.validUntil).toLocaleDateString('en-PK')}</p></div><Badge tone={quote.status === 'PAID' ? 'success' : payable ? 'info' : 'neutral'}>{quote.status}</Badge></header><div className="px-4 py-4 sm:px-5"><p className="whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{quote.description || 'Personalized event service as discussed in this conversation.'}</p>{addOns.length ? <div className="mt-4 border-y border-[#dce5e1]"><div className="hidden grid-cols-[minmax(130px,0.8fr)_minmax(180px,1.4fr)_110px] gap-4 bg-[#f5f8f6] px-3 py-2 text-[10px] font-black uppercase text-[#718079] sm:grid"><span>Item</span><span>Included</span><span className="text-right">Price</span></div>{addOns.map((item, index) => <div key={`${item.name}:${index}`} className="grid gap-2 border-t border-[#e3e9e6] px-3 py-3 first:border-t-0 sm:grid-cols-[minmax(130px,0.8fr)_minmax(180px,1.4fr)_110px] sm:gap-4"><strong className="text-sm text-[#30443b]">{item.name}</strong><ul className="space-y-1 text-xs leading-5 text-[#5f7068]">{item.included.map(inclusion => <li key={inclusion} className="ml-4 list-item list-disc">{inclusion}</li>)}</ul><span className="text-sm font-black text-[#255038] sm:text-right">{money(item.price, quote.currencyCode)}</span></div>)}<div className="flex items-center justify-between gap-4 border-t border-[#cad8d1] bg-[#f5f8f6] px-3 py-3 text-sm"><span className="font-bold text-[#53665d]">Items subtotal</span><span className="font-black text-[#255038]">{money(addOnTotal, quote.currencyCode)}</span></div></div> : null}<div className="mt-4 flex items-center justify-between gap-4 border-b border-[#dce5e1] pb-4"><span className="text-sm font-black text-[#30443b]">Final quotation total</span><span className="text-lg font-black text-[#8c3a18]">{money(quote.amount, quote.currencyCode)}</span></div>{role === 'customer' && payable ? <Link href={quote.checkoutUrl} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-black text-white"><ShoppingBag className="size-4" />Proceed to secure checkout</Link> : null}{role === 'customer' && !payable && quote.status !== 'PAID' ? <p className="mt-4 text-sm font-semibold text-[#9b4638]">This quotation is no longer available for checkout.</p> : null}</div><footer className="border-t border-[#dce5e1] px-4 py-3 text-[11px] text-[#87938e] sm:px-5">Sent {dateTime(sentAt)}</footer></section>;
}

interface QuoteAddOnDraft {
    id: string;
    name: string;
    included: string;
    price: string;
}

function emptyQuoteAddOn(): QuoteAddOnDraft {
    return { id: crypto.randomUUID(), name: '', included: '', price: '' };
}

function VendorQuoteComposer({ conversationId, onSent }: { conversationId: string; onSent: (message: MarketplaceChatMessage) => void }) {
    const [open, setOpen] = useState(false);
    const [sendingQuote, setSendingQuote] = useState(false);
    const [error, setError] = useState('');
    const [amount, setAmount] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [description, setDescription] = useState('');
    const [addOns, setAddOns] = useState<QuoteAddOnDraft[]>([]);
    const addOnTotal = addOns.reduce((total, item) => total + (Number(item.price) || 0), 0);

    function updateAddOn(id: string, value: Partial<QuoteAddOnDraft>) {
        setAddOns(items => items.map(item => item.id === id ? { ...item, ...value } : item));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSendingQuote(true);
        setError('');
        try {
            const response = await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
                conversationId,
                amount: Number(amount),
                description,
                validUntil,
                addOns: addOns.map(item => ({
                    name: item.name,
                    included: item.included.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
                    price: Number(item.price),
                })),
            }) });
            const result = await response.json() as MarketplaceChatMessage & { message?: string };
            if (!response.ok || !result.id) throw new Error(result.message ?? 'Unable to send quotation');
            onSent(result);
            setOpen(false);
            setAmount('');
            setValidUntil('');
            setDescription('');
            setAddOns([]);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to send quotation');
        } finally {
            setSendingQuote(false);
        }
    }
    if (!open) return <div className="mb-3 flex items-center justify-between gap-3 border border-[#cbd8d2] bg-[#f3f7f5] px-4 py-3"><div><p className="text-sm font-black text-[#30443b]">Ready to finalize?</p><p className="mt-0.5 text-xs text-[#718079]">Send the customer a personalized amount for secure checkout.</p></div><Button type="button" size="sm" onClick={() => setOpen(true)}>Create quote</Button></div>;
    return <form onSubmit={submit} className="mb-3 border border-[#b9d2c7] bg-[#f5faf7] p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase text-[#63756d]">Total price (PKR)<input required value={amount} onChange={event => setAmount(event.target.value)} type="number" min="1" step="0.01" className="mt-1 h-10 w-full rounded-md border border-[#cbd7d1] bg-white px-3 text-sm font-semibold" /></label><label className="text-xs font-black uppercase text-[#63756d]">Valid until<input required value={validUntil} onChange={event => setValidUntil(event.target.value)} type="date" min={new Date().toISOString().slice(0, 10)} className="mt-1 h-10 w-full rounded-md border border-[#cbd7d1] bg-white px-3 text-sm font-semibold" /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Quotation details<textarea required value={description} onChange={event => setDescription(event.target.value)} rows={4} placeholder="Deliverables, timeline, concepts, revisions, usage rights, and agreed terms" className="mt-1 w-full rounded-md border border-[#cbd7d1] bg-white p-3 text-sm font-normal normal-case" /><span className="mt-1 block text-[11px] font-medium normal-case text-[#718079]">Include every agreed deliverable and condition before sending.</span></label></div><div className="mt-4 border-t border-[#cbd8d2] pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-[#63756d]">Quotation items</p><p className="mt-1 text-xs text-[#718079]">Add each deliverable, package, or service item with its inclusions and price.</p></div><Button type="button" size="sm" variant="secondary" onClick={() => setAddOns(items => [...items, emptyQuoteAddOn()])}><Plus className="size-4" />Add item</Button></div>{addOns.length ? <div className="mt-3 space-y-3">{addOns.map((item, index) => <div key={item.id} className="grid gap-3 border border-[#d3dfd9] bg-white p-3 md:grid-cols-[minmax(150px,0.8fr)_minmax(220px,1.4fr)_130px_40px]"><label className="text-xs font-black uppercase text-[#63756d]">Name<input required value={item.name} onChange={event => updateAddOn(item.id, { name: event.target.value })} maxLength={120} placeholder={index ? 'Editable source files' : 'Design package'} className="mt-1 h-10 w-full rounded-md border border-[#cbd7d1] px-3 text-sm font-normal normal-case" /></label><label className="text-xs font-black uppercase text-[#63756d]">Included<textarea required value={item.included} onChange={event => updateAddOn(item.id, { included: event.target.value })} rows={3} placeholder={index ? 'AI and SVG source files\nCommercial use' : '5 initial concepts\n2 revision rounds\nPNG and PDF delivery'} className="mt-1 w-full rounded-md border border-[#cbd7d1] p-3 text-sm font-normal normal-case" /></label><label className="text-xs font-black uppercase text-[#63756d]">Price (PKR)<input required value={item.price} onChange={event => updateAddOn(item.id, { price: event.target.value })} type="number" min="0" step="0.01" className="mt-1 h-10 w-full rounded-md border border-[#cbd7d1] px-3 text-sm font-semibold normal-case" /></label><button type="button" onClick={() => setAddOns(items => items.filter(value => value.id !== item.id))} className="grid size-10 place-items-center self-end rounded-md text-[#8c3a18] hover:bg-[#fff0ed] md:self-start md:mt-5" aria-label={`Remove item ${index + 1}`} title="Remove item"><Trash2 className="size-4" /></button></div>)}</div> : <p className="mt-3 border-y border-[#dce5e1] py-4 text-center text-xs text-[#718079]">No items added yet.</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-y border-[#cbd8d2] bg-white px-3 py-3"><div><span className="text-xs font-bold text-[#718079]">Items subtotal</span><strong className="ml-2 text-sm text-[#255038]">{money(Math.round(addOnTotal * 100))}</strong></div><Button type="button" size="sm" variant="secondary" disabled={!addOns.length} onClick={() => setAmount(String(Math.round(addOnTotal * 100) / 100))}><Calculator className="size-4" />Use items total</Button></div><p className="mt-3 text-xs leading-5 text-[#64736d]">Customer payment is collected by the marketplace. Vendor earnings are recorded only after completion and remain on hold for the configured payout period.</p></div>{error ? <p className="mt-3 text-xs font-bold text-[#a74433]">{error}</p> : null}<div className="mt-4 flex justify-end gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" size="sm" disabled={sendingQuote}>{sendingQuote ? 'Sending' : 'Send quote'}</Button></div></form>;
}

function EmptyConversations({ hasSearch }: { hasSearch: boolean }) {
    return <div className="grid min-h-72 place-items-center px-6 text-center"><div><MessageSquareText className="mx-auto size-8 text-[#8a9992]" /><p className="mt-3 text-sm font-black text-[#30443b]">{hasSearch ? 'No matching conversations' : 'No conversations yet'}</p><p className="mt-1 text-xs leading-5 text-[#718079]">{hasSearch ? 'Try another participant, inquiry, appeal, or order code.' : 'Listing inquiries appear here before checkout. Order channels open after payment.'}</p></div></div>;
}

function EmptyChat() {
    return <div className="grid flex-1 place-items-center px-6 text-center"><div><MessageSquareText className="mx-auto size-10 text-[#8a9992]" /><p className="mt-4 font-black text-[#30443b]">Choose a conversation</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#718079]">Messages, receipts, attachments, and approved appeal details appear here.</p></div></div>;
}
