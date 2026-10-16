export function formatMoney(amount: number, currency = 'PKR') {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(date));
}
