export interface GraphQLClientOptions {
    endpoint: string;
    channelToken?: string;
    authToken?: string;
    fetcher?: typeof fetch;
}

export interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string; path?: Array<string | number> }>;
}

export class MarketplaceGraphQLClient {
    private readonly fetcher: typeof fetch;

    constructor(private readonly options: GraphQLClientOptions) {
        this.fetcher = options.fetcher ?? fetch;
    }

    async request<TData, TVariables extends Record<string, unknown> = Record<string, never>>(
        query: string,
        variables?: TVariables,
    ): Promise<TData> {
        const response = await this.fetcher(this.options.endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(this.options.channelToken && this.options.channelToken !== '__default_channel__'
                    ? { 'vendure-token': this.options.channelToken }
                    : {}),
                ...(this.options.authToken
                    ? { authorization: `Bearer ${this.options.authToken}` }
                    : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`Marketplace API request failed with status ${response.status}`);
        }

        const result = (await response.json()) as GraphQLResponse<TData>;
        if (result.errors?.length) {
            throw new Error(result.errors.map(error => error.message).join('; '));
        }
        if (!result.data) {
            throw new Error('Marketplace API returned no data');
        }
        return result.data;
    }
}

export const catalogQueries = {
    searchProducts: `
        query SearchProducts($input: SearchInput!) {
            search(input: $input) {
                totalItems
                items {
                    productId
                    productName
                    slug
                    productAsset { preview }
                    priceWithTax { ... on SinglePrice { value } }
                    currencyCode
                }
            }
        }
    `,
    activeOrder: `
        query ActiveOrder {
            activeOrder {
                id
                code
                totalWithTax
                currencyCode
                totalQuantity
            }
        }
    `,
};
