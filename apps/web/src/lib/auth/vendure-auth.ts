import { MarketplaceRole, MarketplaceSession } from '@marketplace/contracts';

import { siteConfig } from '@/lib/site-config';

const loginMutation = `
    mutation MarketplaceLogin($username: String!, $password: String!) {
        login(username: $username, password: $password, rememberMe: true) {
            ... on CurrentUser { id identifier channels { code token permissions } }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const identityQuery = `
    query MarketplaceIdentity {
        marketplaceIdentity {
            role
            displayName
            identifier
            mustChangePassword
            dashboardPath
        }
    }
`;

const DEFAULT_CHANNEL_CODE = '__default_channel__';
const platformChannelRoles = new Set<MarketplaceRole>(['admin', 'super-admin', 'influencer', 'organizer']);

interface LoginResult {
    login: {
        id?: string;
        identifier?: string;
        channels?: Array<{ code: string; token: string; permissions: string[] }>;
        errorCode?: string;
        message?: string;
    };
}

interface IdentityResult {
    marketplaceIdentity: {
        role: MarketplaceRole;
        displayName: string;
        identifier: string;
        mustChangePassword: boolean;
        dashboardPath: string;
    } | null;
}

function configuredDefaultChannelToken() {
    return siteConfig.channelToken || DEFAULT_CHANNEL_CODE;
}

function vendureDefaultChannelToken(login: LoginResult['login']) {
    if (!siteConfig.channelToken || siteConfig.channelToken === DEFAULT_CHANNEL_CODE) {
        return DEFAULT_CHANNEL_CODE;
    }

    const configuredChannel = login.channels?.find(channel => channel.token === siteConfig.channelToken);
    if (configuredChannel?.code === DEFAULT_CHANNEL_CODE) {
        return configuredChannel.token;
    }

    return (
        login.channels?.find(channel => channel.code === DEFAULT_CHANNEL_CODE)?.token ??
        siteConfig.channelToken
    );
}

function initialChannelToken(login: LoginResult['login']) {
    return login.channels?.[0]?.token ?? configuredDefaultChannelToken();
}

function sessionChannelToken(login: LoginResult['login'], role: MarketplaceRole) {
    if (role === 'vendor') {
        // Customer roles can span every channel; only a vendor role grants workspace access.
        return login.channels?.find(
            channel =>
                channel.code !== DEFAULT_CHANNEL_CODE &&
                channel.permissions.includes('ReadMarketplaceVendor'),
        )?.token;
    }

    if (platformChannelRoles.has(role)) {
        return vendureDefaultChannelToken(login);
    }

    return configuredDefaultChannelToken();
}

export function isMarketplaceAuthorizationError(error: unknown) {
    return (
        error instanceof Error &&
        /not currently authorized|authentication required|forbidden/i.test(error.message)
    );
}

export async function attemptVendureLogin(apiType: 'shop' | 'admin', identifier: string, password: string) {
    const endpoint = apiType === 'shop' ? siteConfig.shopApiUrl : siteConfig.adminApiUrl;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(siteConfig.channelToken && siteConfig.channelToken !== '__default_channel__'
                ? { 'vendure-token': siteConfig.channelToken }
                : {}),
        },
        body: JSON.stringify({ query: loginMutation, variables: { username: identifier, password } }),
        cache: 'no-store',
    });
    const payload = (await response.json()) as { data?: LoginResult; errors?: Array<{ message: string }> };
    const login = payload.data?.login;
    if (!response.ok || payload.errors?.length || !login?.id) {
        return {
            success: false as const,
            errorCode: login?.errorCode,
            message: login?.message ?? payload.errors?.[0]?.message ?? 'Invalid email or password',
        };
    }
    const authToken = response.headers.get('vendure-auth-token');
    if (!authToken) {
        return { success: false as const, message: 'Authentication token was not returned' };
    }
    const initialToken = initialChannelToken(login);
    const identity = await fetchMarketplaceIdentity(apiType, authToken, initialToken);
    if (!identity) {
        return { success: false as const, message: 'This account does not have marketplace access' };
    }
    const channelToken = sessionChannelToken(login, identity.role);
    if (!channelToken) {
        return { success: false as const, message: 'This account has no authorized vendor workspace' };
    }
    const verifiedIdentity =
        channelToken === initialToken
            ? identity
            : await fetchMarketplaceIdentity(apiType, authToken, channelToken);
    if (!verifiedIdentity) {
        return { success: false as const, message: 'This account does not have marketplace access' };
    }
    const session: MarketplaceSession = {
        ...verifiedIdentity,
        apiType,
        channelToken,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    return { success: true as const, authToken, session };
}

export async function fetchMarketplaceIdentity(
    apiType: 'shop' | 'admin',
    authToken: string,
    channelToken = siteConfig.channelToken,
) {
    const endpoint = apiType === 'shop' ? siteConfig.shopApiUrl : siteConfig.adminApiUrl;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${authToken}`,
            ...(channelToken && channelToken !== '__default_channel__'
                ? { 'vendure-token': channelToken }
                : {}),
        },
        body: JSON.stringify({ query: identityQuery }),
        cache: 'no-store',
    });
    const payload = (await response.json()) as { data?: IdentityResult; errors?: Array<{ message: string }> };
    if (!response.ok || payload.errors?.length) return null;
    return payload.data?.marketplaceIdentity ?? null;
}

export async function authenticatedVendureRequest<T>(
    apiType: 'shop' | 'admin',
    authToken: string,
    query: string,
    variables?: Record<string, unknown>,
    channelToken = siteConfig.channelToken,
): Promise<T> {
    const endpoint = apiType === 'shop' ? siteConfig.shopApiUrl : siteConfig.adminApiUrl;
    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${authToken}`,
                ...(channelToken && channelToken !== '__default_channel__'
                    ? { 'vendure-token': channelToken }
                    : {}),
            },
            body: JSON.stringify({ query, variables }),
            cache: 'no-store',
        });
    } catch {
        throw new Error(
            'The marketplace API is starting or unavailable. Please wait a moment and try again.',
        );
    }
    const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || payload.errors?.length || !payload.data) {
        throw new Error(payload.errors?.[0]?.message ?? 'Marketplace API request failed');
    }
    return payload.data;
}
