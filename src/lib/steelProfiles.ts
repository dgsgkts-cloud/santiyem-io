export interface SteelProfile {
  name: string;
  series: string;
  A: number;   // cm²
  G: number;   // kg/m
  h: number;   // mm
  b: number;   // mm
  tw: number;  // mm
  tf: number;  // mm
  Ix: number;  // cm4
  Wplx: number; // cm3
  ix: number;  // cm
  Iy: number;  // cm4
  Wply: number; // cm3
  iy: number;  // cm
}

export interface SteelMaterial {
  name: string;
  Fy: number; // MPa
  Fu: number; // MPa
}

export const MATERIALS: SteelMaterial[] = [
  { name: "S235", Fy: 235, Fu: 360 },
  { name: "S275", Fy: 275, Fu: 430 },
  { name: "S355", Fy: 355, Fu: 490 },
];

const ipe = (name: string, A: number, G: number, h: number, b: number, tw: number, tf: number, Ix: number, Wplx: number, ix: number, Iy: number, Wply: number, iy: number): SteelProfile =>
  ({ name, series: "IPE", A, G, h, b, tw, tf, Ix, Wplx, ix, Iy, Wply, iy });

const hea = (name: string, A: number, G: number, h: number, b: number, tw: number, tf: number, Ix: number, Wplx: number, ix: number, Iy: number, Wply: number, iy: number): SteelProfile =>
  ({ name, series: "HEA", A, G, h, b, tw, tf, Ix, Wplx, ix, Iy, Wply, iy });

const heb = (name: string, A: number, G: number, h: number, b: number, tw: number, tf: number, Ix: number, Wplx: number, ix: number, Iy: number, Wply: number, iy: number): SteelProfile =>
  ({ name, series: "HEB", A, G, h, b, tw, tf, Ix, Wplx, ix, Iy, Wply, iy });

export const IPE_PROFILES: SteelProfile[] = [
  ipe("IPE 80",   7.64,  6.0,  80,  46, 3.8, 5.2,   80.1,   20.0,  3.24,    8.49,   3.69, 1.05),
  ipe("IPE 100", 10.32,  8.1, 100,  55, 4.1, 5.7,  171,     34.2,  4.07,   15.9,    5.79, 1.24),
  ipe("IPE 120", 13.21, 10.4, 120,  64, 4.4, 6.3,  318,     52.9,  4.90,   27.7,    8.65, 1.45),
  ipe("IPE 140", 16.43, 12.9, 140,  73, 4.7, 6.9,  541,     77.3,  5.74,   44.9,   12.3,  1.65),
  ipe("IPE 160", 20.09, 15.8, 160,  82, 5.0, 7.4,  869,    109,    6.58,   68.3,   16.7,  1.84),
  ipe("IPE 180", 23.95, 18.8, 180,  91, 5.3, 8.0, 1317,    146,    7.42,  101,     22.2,  2.05),
  ipe("IPE 200", 28.48, 22.4, 200, 100, 5.6, 8.5, 1943,    194,    8.26,  142,     28.5,  2.24),
  ipe("IPE 220", 33.37, 26.2, 220, 110, 5.9, 9.2, 2772,    252,    9.11,  205,     37.3,  2.48),
  ipe("IPE 240", 39.12, 30.7, 240, 120, 6.2, 9.8, 3892,    324,    9.97,  284,     47.3,  2.69),
  ipe("IPE 270", 45.95, 36.1, 270, 135, 6.6,10.2, 5790,    429,   11.2,   420,     62.2,  3.02),
  ipe("IPE 300", 53.81, 42.2, 300, 150, 7.1,10.7, 8356,    557,   12.5,   604,     80.5,  3.35),
  ipe("IPE 330", 62.61, 49.1, 330, 160, 7.5,11.5,11770,    713,   13.7,   788,     98.5,  3.55),
  ipe("IPE 360", 72.73, 57.1, 360, 170, 8.0,12.7,16270,    904,   15.0,  1044,    123,    3.79),
  ipe("IPE 400", 84.46, 66.3, 400, 180, 8.6,13.5,23130,   1156,   16.5,  1318,    146,    3.95),
  ipe("IPE 450", 98.82, 77.6, 450, 190, 9.4,14.6,33740,   1500,   18.5,  1676,    176,    4.12),
  ipe("IPE 500",115.5,  90.7, 500, 200,10.2,16.0,48200,   2194,   20.4,  2142,    336,    4.31),
  ipe("IPE 550",134.4, 106,   550, 210,11.1,17.2,67120,   2441,   22.4,  2670,    254,    4.45),
  ipe("IPE 600",156.0, 122,   600, 220,12.0,19.0,92080,   3512,   24.3,  3387,    308,    4.66),
];

export const HEA_PROFILES: SteelProfile[] = [
  hea("HEA 100", 21.24, 16.7,  96, 100, 5.0, 8.0,   349,  148,  4.06,  134,   57.6, 2.51),
  hea("HEA 120", 25.34, 19.9, 114, 120, 5.0, 8.0,   606,  270,  4.89,  231,   96.9, 3.02),
  hea("HEA 140", 31.42, 24.7, 133, 140, 5.5, 8.5,  1033,  389,  5.73,  389,  137,   3.52),
  hea("HEA 160", 38.77, 30.4, 152, 160, 6.0, 9.0,  1673,  524,  6.57,  616,  192,   3.99),
  hea("HEA 180", 45.25, 35.5, 171, 180, 6.0, 9.5,  2510,  641,  7.45,  925,  257,   4.52),
  hea("HEA 200", 53.83, 42.3, 190, 200, 6.5,10.0,  3692,  975,  8.28, 1336,  335,   4.98),
  hea("HEA 220", 64.34, 50.5, 210, 220, 7.0,11.0,  5410, 1283,  9.17, 1955,  446,   5.51),
  hea("HEA 240", 76.84, 60.3, 230, 240, 7.5,12.0,  7763, 1614, 10.1,  2769,  615,   6.00),
  hea("HEA 260", 86.82, 68.2, 250, 260, 7.5,12.5, 10450, 1868, 11.0,  3668,  742,   6.50),
  hea("HEA 280", 97.26, 76.4, 270, 280, 8.0,13.0, 13670, 2395, 11.9,  4763,  968,   7.00),
  hea("HEA 300",112.5,  88.3, 290, 300, 8.5,14.0, 18260, 3005, 12.7,  6310, 1199,   7.49),
];

export const HEB_PROFILES: SteelProfile[] = [
  heb("HEB 100", 26.04, 20.4, 100, 100, 6.0,10.0,   450,  180,  4.16,  167,   67.1, 2.53),
  heb("HEB 120", 34.01, 26.7, 120, 120, 6.5,11.0,   864,  288,  5.04,  318,  106,   3.06),
  heb("HEB 140", 42.96, 33.7, 140, 140, 7.0,12.0,  1509,  432,  5.93,  550,  157,   3.58),
  heb("HEB 160", 54.25, 42.6, 160, 160, 8.0,13.0,  2492,  624,  6.78,  889,  222,   4.05),
  heb("HEB 180", 65.25, 51.2, 180, 180, 8.5,14.0,  3831,  850,  7.66, 1363,  303,   4.57),
  heb("HEB 200", 78.08, 61.3, 200, 200, 9.0,15.0,  5696, 1139,  8.54, 2003,  400,   5.07),
  heb("HEB 220", 91.04, 71.5, 220, 220, 9.5,16.0,  8091, 1469,  9.43, 2843,  516,   5.59),
  heb("HEB 240",106.0,  83.2, 240, 240,10.0,17.0, 11260, 1874, 10.3,  3923,  653,   6.08),
  heb("HEB 260",118.4,  93.0, 260, 260,10.0,17.5, 14920, 2288, 11.2,  5135,  789,   6.58),
  heb("HEB 280",131.4, 103,   280, 280,10.5,18.0, 19270, 2746, 12.1,  6595,  940,   7.09),
  heb("HEB 300",149.1, 117,   300, 300,11.0,19.0, 25170, 3352, 13.0,  8563, 1141,   7.58),
];

export const ALL_PROFILES: SteelProfile[] = [...IPE_PROFILES, ...HEA_PROFILES, ...HEB_PROFILES];

export function getProfilesBySeriesGroup(): { label: string; profiles: SteelProfile[] }[] {
  return [
    { label: "IPE Serileri", profiles: IPE_PROFILES },
    { label: "HEA Serileri", profiles: HEA_PROFILES },
    { label: "HEB Serileri", profiles: HEB_PROFILES },
  ];
}
