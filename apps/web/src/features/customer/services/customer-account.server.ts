import 'server-only';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { CustomerAccount, CustomerAccountData, CustomerAddress, CustomerAddressInput } from '../types';

const customerFields = `
    id firstName lastName emailAddress phoneNumber
    addresses {
        id fullName company streetLine1 streetLine2 city province postalCode phoneNumber
        country { code name }
        defaultShippingAddress defaultBillingAddress
    }
`;

const addressFields = `
    id fullName company streetLine1 streetLine2 city province postalCode phoneNumber
    country { code name }
    defaultShippingAddress defaultBillingAddress
`;

export async function getCustomerAccount(authToken: string, channelToken: string): Promise<CustomerAccountData> {
    const result = await authenticatedVendureRequest<{
        activeCustomer: CustomerAccount | null;
        availableCountries: Array<{ code: string; name: string }>;
    }>('shop', authToken, `query CustomerAccount { activeCustomer { ${customerFields} } availableCountries { code name } }`, undefined, channelToken);
    if (!result.activeCustomer) throw new Error('Customer account not found');
    return { account: result.activeCustomer, countries: result.availableCountries };
}

export async function updateCustomerAccount(
    authToken: string,
    channelToken: string,
    input: { firstName: string; lastName: string; phoneNumber?: string },
) {
    const result = await authenticatedVendureRequest<{ updateCustomer: CustomerAccount }>(
        'shop',
        authToken,
        `mutation UpdateCustomerAccount($input: UpdateCustomerInput!) { updateCustomer(input: $input) { ${customerFields} } }`,
        { input },
        channelToken,
    );
    return result.updateCustomer;
}

export async function createCustomerAddress(authToken: string, channelToken: string, input: CustomerAddressInput) {
    const result = await authenticatedVendureRequest<{ createCustomerAddress: CustomerAddress }>(
        'shop',
        authToken,
        `mutation CreateCustomerAddress($input: CreateAddressInput!) { createCustomerAddress(input: $input) { ${addressFields} } }`,
        { input },
        channelToken,
    );
    return result.createCustomerAddress;
}

export async function updateCustomerAddress(authToken: string, channelToken: string, id: string, input: CustomerAddressInput) {
    const result = await authenticatedVendureRequest<{ updateCustomerAddress: CustomerAddress }>(
        'shop',
        authToken,
        `mutation UpdateCustomerAddress($input: UpdateAddressInput!) { updateCustomerAddress(input: $input) { ${addressFields} } }`,
        { input: { id, ...input } },
        channelToken,
    );
    return result.updateCustomerAddress;
}

export async function deleteCustomerAddress(authToken: string, channelToken: string, id: string) {
    const result = await authenticatedVendureRequest<{ deleteCustomerAddress: { success: boolean } }>(
        'shop',
        authToken,
        'mutation DeleteCustomerAddress($id: ID!) { deleteCustomerAddress(id: $id) { success } }',
        { id },
        channelToken,
    );
    return result.deleteCustomerAddress.success;
}
