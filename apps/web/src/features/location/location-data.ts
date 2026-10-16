export const pakistanLocations: Record<string, string[]> = {
    Punjab: ['Bahawalpur', 'Dera Ghazi Khan', 'Faisalabad', 'Gujranwala', 'Gujrat', 'Lahore', 'Multan', 'Rawalpindi', 'Sahiwal', 'Sargodha', 'Sheikhupura', 'Sialkot'],
    Sindh: ['Hyderabad', 'Karachi', 'Khairpur', 'Larkana', 'Mirpur Khas', 'Nawabshah', 'Sukkur'],
    'Khyber Pakhtunkhwa': ['Abbottabad', 'Bannu', 'Dera Ismail Khan', 'Mardan', 'Mingora', 'Nowshera', 'Peshawar'],
    Balochistan: ['Chaman', 'Gwadar', 'Khuzdar', 'Quetta', 'Turbat'],
    'Islamabad Capital Territory': ['Islamabad'],
    'Gilgit-Baltistan': ['Gilgit', 'Skardu'],
    'Azad Jammu and Kashmir': ['Mirpur', 'Muzaffarabad', 'Rawalakot'],
};

export const pakistanProvinces = Object.keys(pakistanLocations);

export function findPakistanCity(value: string) {
    const normalized = value.trim().toLocaleLowerCase('en');
    if (!normalized) return undefined;
    for (const [province, cities] of Object.entries(pakistanLocations)) {
        const city = cities.find(item => item.toLocaleLowerCase('en') === normalized);
        if (city) return { province, city };
    }
    return undefined;
}
