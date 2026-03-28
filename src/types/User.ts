export interface Org {
    orgId: number;
    orgName: string;
    roles: string[];
    facilities: {
        facilityId: number;
        facilityName: string;
        roles: string[];
    }[];
}

export interface User {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phone: string;
    fullName?: string;
    profileImage?: string;
    dateOfBirth?: string; // always normalized as string in frontend
    orgName?: string;
    role?: string;
    city?: string;
    state?: string;
    country?: string;
    street?: string;
    street2?: string;
    postalCode?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    token?: string;
    orgIds?: number[];
    orgs?: Org[];
    userId?: number;
}
