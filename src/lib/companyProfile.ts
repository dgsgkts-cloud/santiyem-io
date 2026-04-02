// Company profile stored in localStorage
export interface CompanyProfile {
  logoDataUrl: string; // base64 data URL for the logo
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  mersisNo: string;
  kepAddress: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  authorizedPerson: string;
  authorizedTitle: string;
}

const STORAGE_KEY = "santiyem_company_profile";

const DEFAULT_PROFILE: CompanyProfile = {
  logoDataUrl: "",
  companyName: "Göktaş Global Mühendislik İnşaat İç ve Dış Tic. Lim. Şirketi",
  taxOffice: "Akdeniz",
  taxNumber: "4060719380",
  mersisNo: "0406071938000001",
  kepAddress: "goktasglobal@hs06.kep.tr",
  address: "Uluçınar Mah. 12 Özgürkent Sk. No:4 Arsuz / Hatay",
  district: "Arsuz",
  city: "Hatay",
  phone: "+90 (533) 377 11 56",
  email: "info@goktasglobal.com",
  website: "",
  authorizedPerson: "",
  authorizedTitle: "İnşaat Mühendisi",
};

export function getCompanyProfile(): CompanyProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_PROFILE };
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function isCompanyProfileComplete(profile: CompanyProfile): boolean {
  return !!(profile.companyName && profile.address && profile.phone);
}
