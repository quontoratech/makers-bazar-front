export interface VendorWeeklyHours {
    dayOfWeek: number;
    enabled: boolean;
    opensAt: string;
    closesAt: string;
}

export interface VendorUnavailableDate {
    id: string;
    date: string;
    reason: string;
}

export interface VendorAvailability {
    status: 'OPEN' | 'CLOSED' | 'PAUSED' | 'HOLIDAY' | 'SPECIAL_CLOSURE';
    isOpen: boolean;
    acceptsPerishableOrders: boolean;
    label: string;
    reason?: string;
    timezone: string;
    currentDate: string;
    todayHours?: string;
    weeklyHours: VendorWeeklyHours[];
}

export interface VendorAvailabilitySettings {
    id: string;
    shopName: string;
    availabilityPaused: boolean;
    availabilityPauseReason?: string;
    availabilityTimezone: string;
    weeklyHours?: VendorWeeklyHours[];
    unavailableDates?: VendorUnavailableDate[];
    holidayModeEnabled: boolean;
    holidayStartsAt?: string;
    holidayEndsAt?: string;
    holidayReason?: string;
    availability: VendorAvailability;
}
