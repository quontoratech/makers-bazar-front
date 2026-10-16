export interface CustomerAddress {
    id: string;
    fullName?: string;
    company?: string;
    streetLine1: string;
    streetLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phoneNumber?: string;
    country: { code: string; name: string };
    defaultShippingAddress?: boolean;
    defaultBillingAddress?: boolean;
}

export interface CustomerAccount {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string;
    addresses: CustomerAddress[];
}

export interface CustomerAccountData {
    account: CustomerAccount;
    countries: Array<{ code: string; name: string }>;
}

export interface CustomerAddressInput {
    fullName?: string;
    company?: string;
    streetLine1: string;
    streetLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phoneNumber?: string;
    countryCode: string;
    defaultShippingAddress?: boolean;
    defaultBillingAddress?: boolean;
}
