import { FolderOpen, Clock, TrendingUp, AlertTriangle } from "lucide-react";

export interface Project {
  id: string;
  name: string;
  client: string;
  start: string;
  end: string;
  progress: number;
  status: string;
  statusColor: string;
  done: number;
  ongoing: number;
  failed: number;
  delayed: number;
  budget: string;
  location: string;
  manager: string;
  description: string;
  milestones: { title: string; date: string; completed: boolean }[];
  recentActivity: { text: string; time: string; color: string }[];
}

export const PROJECTS: Project[] = [
  {
    id: "villa-cesme",
    name: "Villa Projesi - Çeşme",
    client: "Mehmet Bey",
    start: "15.01.2026",
    end: "15.06.2026",
    progress: 75,
    status: "Devam Ediyor",
    statusColor: "#22C55E",
    done: 18, ongoing: 6, failed: 0, delayed: 0,
    budget: "₺2.8M",
    location: "Çeşme, İzmir",
    manager: "Ali Mühendis",
    description: "Deniz manzaralı lüks villa projesi. 3 katlı, havuzlu, akıllı ev sistemli.",
    milestones: [
      { title: "Temel atma", date: "20.01.2026", completed: true },
      { title: "Kaba inşaat", date: "15.03.2026", completed: true },
      { title: "Çatı montajı", date: "01.05.2026", completed: false },
      { title: "İç mekan", date: "01.06.2026", completed: false },
      { title: "Teslim", date: "15.06.2026", completed: false },
    ],
    recentActivity: [
      { text: "Hakediş onaylandı", time: "2 saat önce", color: "#22C55E" },
      { text: "Elektrik tesisatı tamamlandı", time: "1 gün önce", color: "#22C55E" },
      { text: "Çatı malzemesi sipariş edildi", time: "2 gün önce", color: "#818CF8" },
    ],
  },
  {
    id: "avm-ankara",
    name: "AVM İnşaatı - Ankara",
    client: "Yıldız İnşaat",
    start: "01.03.2026",
    end: "01.12.2026",
    progress: 42,
    status: "Gecikmiş",
    statusColor: "#EF4444",
    done: 8, ongoing: 12, failed: 2, delayed: 2,
    budget: "₺18.5M",
    location: "Çankaya, Ankara",
    manager: "Zeynep Mühendis",
    description: "5 katlı alışveriş merkezi. 120 mağaza kapasiteli, otoparklı.",
    milestones: [
      { title: "Kazı işleri", date: "15.03.2026", completed: true },
      { title: "Temel betonarme", date: "01.05.2026", completed: true },
      { title: "Çelik konstrüksiyon", date: "01.07.2026", completed: false },
      { title: "Cephe kaplama", date: "01.10.2026", completed: false },
      { title: "Teslim", date: "01.12.2026", completed: false },
    ],
    recentActivity: [
      { text: "Gecikme raporu eklendi", time: "4 saat önce", color: "#EF4444" },
      { text: "2. kat kalıp işleri devam", time: "1 gün önce", color: "#F59E0B" },
    ],
  },
  {
    id: "konut-istanbul",
    name: "Konut Projesi - İstanbul",
    client: "Atlas Yapı",
    start: "10.11.2025",
    end: "10.04.2026",
    progress: 91,
    status: "Tamamlanıyor",
    statusColor: "#F59E0B",
    done: 22, ongoing: 2, failed: 0, delayed: 0,
    budget: "₺5.2M",
    location: "Kadıköy, İstanbul",
    manager: "Can Mühendis",
    description: "8 katlı konut projesi. 24 daire, kapalı otopark, sosyal tesis.",
    milestones: [
      { title: "Temel", date: "01.12.2025", completed: true },
      { title: "Kaba inşaat", date: "01.02.2026", completed: true },
      { title: "İnce işler", date: "15.03.2026", completed: true },
      { title: "Peyzaj", date: "01.04.2026", completed: false },
      { title: "Teslim", date: "10.04.2026", completed: false },
    ],
    recentActivity: [
      { text: "%90'ı geçildi", time: "1 gün önce", color: "#F59E0B" },
      { text: "Asansör montajı tamamlandı", time: "3 gün önce", color: "#22C55E" },
    ],
  },
  {
    id: "fabrika-kocaeli",
    name: "Fabrika - Kocaeli",
    client: "Endüstri A.Ş.",
    start: "01.02.2026",
    end: "01.08.2026",
    progress: 28,
    status: "Devam Ediyor",
    statusColor: "#22C55E",
    done: 5, ongoing: 10, failed: 1, delayed: 1,
    budget: "₺8.7M",
    location: "Gebze, Kocaeli",
    manager: "Burak Mühendis",
    description: "Endüstriyel üretim tesisi. 5000m² kapalı alan, ofis bloğu.",
    milestones: [
      { title: "Arazi düzenleme", date: "15.02.2026", completed: true },
      { title: "Temel betonarme", date: "01.04.2026", completed: false },
      { title: "Çelik yapı", date: "01.06.2026", completed: false },
      { title: "Mekanik tesisat", date: "15.07.2026", completed: false },
      { title: "Teslim", date: "01.08.2026", completed: false },
    ],
    recentActivity: [
      { text: "Temel betonu dökümü planlandı", time: "5 saat önce", color: "#818CF8" },
      { text: "Zemin etüdü tamamlandı", time: "2 gün önce", color: "#22C55E" },
    ],
  },
];

export const getProjectById = (id: string) => PROJECTS.find(p => p.id === id);
