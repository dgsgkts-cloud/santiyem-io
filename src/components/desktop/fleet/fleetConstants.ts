// Sprint M1.6 — Fleet & Equipment shared types + deterministic data helpers.
// Frontend-only. No backend / schema / business logic changes.

export const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
export const fmtTRY = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
export const fmtNum = (n: number) => n.toLocaleString("tr-TR");

export const EQUIPMENT_TYPES = [
  { key: "excavator", name: "Ekskavatör", brand: "Cat", models: ["320", "336", "349"] },
  { key: "loader", name: "Yükleyici", brand: "Volvo", models: ["L60H", "L110H", "L150H"] },
  { key: "bulldozer", name: "Buldozer", brand: "Komatsu", models: ["D65", "D85", "D155"] },
  { key: "crane", name: "Vinç", brand: "Liebherr", models: ["LTM 1050", "LTM 1090"] },
  { key: "concrete-mixer", name: "Beton Mikseri", brand: "Mercedes", models: ["Arocs 3240", "Arocs 4142"] },
  { key: "truck", name: "Damperli Kamyon", brand: "Ford", models: ["Cargo 4142", "Cargo 3548"] },
  { key: "roller", name: "Silindir", brand: "Hamm", models: ["H11i", "H13i"] },
  { key: "forklift", name: "Forklift", brand: "Linde", models: ["H30", "H50"] },
] as const;

export type EqStatus = "healthy" | "maintenance-soon" | "in-maintenance" | "broken";

export const STATUS_META: Record<EqStatus, { label: string; cls: string; dot: string }> = {
  healthy: { label: "Sağlıklı", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "maintenance-soon": { label: "Bakım Yaklaşıyor", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  "in-maintenance": { label: "Bakımda", cls: "bg-sky-500/10 text-sky-400 border-sky-500/20", dot: "bg-sky-400" },
  broken: { label: "Arızalı", cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

export type Equipment = {
  id: string; code: string; type: string; typeKey: string; name: string;
  brand: string; model: string; serial: string; year: number;
  project: string; operator: string; engineHours: number; targetService: number;
  status: EqStatus; health: number; fuelType: "Dizel" | "Benzin";
  hourlyCost: number; purchasePrice: number; utilization: number; idleDays: number;
};

export type Maintenance = {
  id: string; equipmentCode: string; equipmentName: string;
  kind: "scheduled" | "completed" | "overdue" | "urgent";
  title: string; mechanic: string; cost: number; hours: number; whenDays: number;
  parts: string[]; notes: string;
};

export type FuelEntry = {
  id: string; equipmentCode: string; equipmentName: string; whenDays: number;
  fuelType: "Dizel" | "Benzin"; liters: number; unitPrice: number; supplier: string;
};

export type OperatorAssignment = {
  id: string; operator: string; license: string; equipmentCode: string; equipmentName: string;
  project: string; assignedDays: number; hoursWorked: number; performance: number;
};

export const OPERATORS = [
  { name: "Mehmet Yılmaz", license: "G Sınıfı — Ekskavatör" },
  { name: "Ahmet Kaya", license: "G Sınıfı — Yükleyici" },
  { name: "Hasan Demir", license: "F Sınıfı — Vinç" },
  { name: "Mustafa Şahin", license: "E Sınıfı — Kamyon" },
  { name: "Osman Aydın", license: "G Sınıfı — Buldozer" },
  { name: "İbrahim Çelik", license: "F Sınıfı — Forklift" },
  { name: "Ali Aksoy", license: "G Sınıfı — Silindir" },
  { name: "Emre Doğan", license: "E Sınıfı — Mikser" },
];

export const MECHANICS = ["Servet Usta", "Recep Usta", "Bayram Usta", "Kadir Usta"];
export const FUEL_SUPPLIERS = ["OPET Filo", "Shell Card", "BP Fleet", "Petrol Ofisi"];

export type FleetTab =
  | "overview" | "equipment" | "vehicles" | "maintenance"
  | "fuel" | "operators" | "hours" | "analytics";

// ---------- generators ----------
export function makeEquipment(projects: string[]): Equipment[] {
  return EQUIPMENT_TYPES.flatMap((t, ti) =>
    t.models.map((m, mi) => {
      const idx = ti * 4 + mi;
      const r = seed(idx + 3);
      const health = 45 + Math.round(seed(idx + 11) * 55);
      const status: EqStatus =
        health < 55 ? "broken" :
        health < 70 ? "in-maintenance" :
        health < 82 ? "maintenance-soon" : "healthy";
      const engineHours = 800 + Math.round(seed(idx + 19) * 8200);
      const targetService = Math.ceil((engineHours + 40) / 250) * 250;
      return {
        id: `eq-${idx}`,
        code: `EQ-${String(1001 + idx).padStart(4, "0")}`,
        type: t.name,
        typeKey: t.key,
        name: `${t.brand} ${m}`,
        brand: t.brand,
        model: m,
        serial: `${t.brand.slice(0, 2).toUpperCase()}${String(9200 + idx * 37 % 900).padStart(4, "0")}-${2018 + (idx % 6)}`,
        year: 2018 + (idx % 6),
        project: projects[idx % Math.max(projects.length, 1)] ?? "Genel Filo",
        operator: OPERATORS[idx % OPERATORS.length].name,
        engineHours,
        targetService,
        status,
        health,
        fuelType: (t.key === "forklift" ? "Benzin" : "Dizel") as "Benzin" | "Dizel",
        hourlyCost: 180 + Math.round(r * 420),
        purchasePrice: 850_000 + Math.round(seed(idx + 41) * 6_500_000),
        utilization: Math.round(20 + seed(idx + 51) * 75),
        idleDays: Math.round(seed(idx + 71) * 12),
      };
    })
  );
}

export function makeMaintenance(equipment: Equipment[]): Maintenance[] {
  const kinds: Maintenance["kind"][] = ["scheduled", "completed", "overdue", "urgent"];
  const titles = ["Yağ ve Filtre Değişimi", "Hidrolik Bakım", "Motor Revizyon", "Fren Sistemi", "Şanzıman Kontrol", "Yürüyüş Takımı"];
  return equipment.slice(0, 18).map((e, i) => {
    const kind = kinds[i % kinds.length];
    return {
      id: `mn-${i}`,
      equipmentCode: e.code,
      equipmentName: e.name,
      kind,
      title: titles[i % titles.length],
      mechanic: MECHANICS[i % MECHANICS.length],
      cost: 3_200 + Math.round(seed(i + 5) * 24_000),
      hours: 2 + Math.round(seed(i + 9) * 12),
      whenDays: (kind === "overdue" ? -3 - (i % 7) : kind === "completed" ? -(i % 20) - 2 : (i % 21) + 1),
      parts: ["Motor yağı 10W-40", "Yağ filtresi", i % 2 === 0 ? "Hidrolik yağı" : "Yakıt filtresi"],
      notes: kind === "urgent" ? "Acil müdahale gerekli — üretim durmuş." : "Planlı bakım aralığı içinde.",
    };
  });
}

export function makeFuel(equipment: Equipment[]): FuelEntry[] {
  return Array.from({ length: 32 }, (_, i) => {
    const eq = equipment[i % equipment.length];
    return {
      id: `fuel-${i}`,
      equipmentCode: eq.code,
      equipmentName: eq.name,
      whenDays: -(i % 28) - 1,
      fuelType: eq.fuelType,
      liters: 40 + Math.round(seed(i + 3) * 380),
      unitPrice: 42 + seed(i + 7) * 4,
      supplier: FUEL_SUPPLIERS[i % FUEL_SUPPLIERS.length],
    };
  });
}

export function makeAssignments(equipment: Equipment[]): OperatorAssignment[] {
  return equipment.slice(0, 14).map((e, i) => ({
    id: `as-${i}`,
    operator: OPERATORS[i % OPERATORS.length].name,
    license: OPERATORS[i % OPERATORS.length].license,
    equipmentCode: e.code,
    equipmentName: e.name,
    project: e.project,
    assignedDays: 30 + Math.round(seed(i + 4) * 180),
    hoursWorked: 120 + Math.round(seed(i + 8) * 780),
    performance: 65 + Math.round(seed(i + 12) * 32),
  }));
}
