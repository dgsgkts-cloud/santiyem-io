# Puantaj & Personel Modülü Planı

Hedef: Tek merkezi personel listesi üzerinden hem QR yoklama hem aylık puantaj. Maliyet, kişinin çalışma tipine göre hesaplansın.

## 1. Veritabanı (tek migration)

### Yeni tablolar

**`personnel`** (merkezi kişi kaydı — TEK KAYNAK)
- `id`, `user_id` (sahip), `full_name`, `phone` (unique within owner, eşleştirme anahtarı), `occupation`, `title`, `is_active`
- `employment_type` enum: `daily_wage` | `monthly_salary` | `subcontractor_crew`
- `daily_wage` numeric (yevmiyeli için)
- `monthly_salary` numeric (maktu aylık için)
- `subcontractor_id` uuid (taşeron ekibi için → mevcut `subcontractors`)

**`personnel_project_assignments`** (aynı kişi birden fazla projede)
- `personnel_id`, `project_id`, `salary_share_percent` (maktu için, varsayılan 100), `salary_share_amount` (alternatif), `is_active`
- UNIQUE(personnel_id, project_id)

**`attendance_records`** (aylık puantaj ızgarası)
- `id`, `user_id`, `personnel_id`, `project_id`, `work_date`, `status` enum: `full_day` | `half_day` | `absent` | `leave`
- `source` enum: `manual` | `qr` (QR'dan otomatik gelirse)
- `qr_attendance_id` uuid nullable (worker_attendance referansı)
- UNIQUE(personnel_id, project_id, work_date)

**`unmatched_qr_checkins`** (telefon eşleşmeyen QR girişleri — uyarı listesi)
- View ya da tablo: `worker_attendance` içinden `personnel`'le eşleşmeyen kayıtlar. View olarak yapacağım.

### Mevcut tablolarda değişiklik
- `worker_attendance`: zaten `phone` var. Trigger ekle → INSERT olduğunda `personnel` ile telefondan eşleş, eşleşirse `attendance_records`'a otomatik `full_day` yaz, `source='qr'`.

### RPC / fonksiyonlar
- `bulk_upsert_attendance(records jsonb)` — mobil hızlı giriş
- `compute_project_labor_cost(_project, _month)` — projenin yevmiyeli + maktu aylık maliyeti
- `set_personnel_attendance(personnel, project, date, status)` — tek hücre güncelleme
- Trigger: `on_worker_attendance_insert_match_personnel`

### RLS
- `personnel`, `assignments`, `attendance_records`: SELECT `can_access_team_resource(auth.uid(), user_id) OR can_access_project(auth.uid(), project_id)`
- INSERT/UPDATE/DELETE: owner / manager / site_engineer / accountant rollerine göre `has_project_permission`

### GRANT
- Her yeni tabloya `GRANT SELECT,INSERT,UPDATE,DELETE ... TO authenticated; GRANT ALL ... TO service_role;` (anon yok)

### projectPermissions (frontend)
Yeni anahtarlar: `manage_personnel`, `view_personnel_costs`, `edit_attendance`. Şablonlara işle:
- owner/accountant: full
- manager: manage + view costs
- site_engineer: edit_attendance (maliyet yok)
- worker: sadece `view_attendance_own`
- subcontractor: `view_attendance_own_team`

## 2. Frontend

### Yeni dosyalar
- `src/hooks/usePersonnel.ts` — CRUD + projeye atama
- `src/hooks/useAttendanceGrid.ts` — ay+proje → ızgara verisi
- `src/lib/laborCost.ts` — tipe göre maliyet hesabı
- `src/components/personnel/PersonnelList.tsx` — merkezi liste, tip filtresi, "tanımsız kişi" uyarı badge
- `src/components/personnel/PersonnelForm.tsx` — ad/telefon/tip seç, tipe göre alan göster (yevmiye | maaş + dağıtım | taşeron seç)
- `src/components/personnel/AttendanceGrid.tsx` — ay × kişi ızgarası, hücre tıkla→durum döngüsü, mobilde "bugün" tek ekran
- `src/components/personnel/AttendanceMobileDaily.tsx` — şef için günün yoklaması
- `src/components/personnel/LaborCostSummary.tsx` — proje aylık toplam, tip kırılımı
- `src/components/personnel/UnmatchedQRBanner.tsx` — telefon eşleşmemiş QR girişleri için CTA "listeye ekle"
- `src/pages/PersonnelPage.tsx` — sekmeli sayfa: Liste / Puantaj / Maliyet
- `src/lib/attendanceExport.ts` — PDF (jspdf+autotable, TR karakter) ve Excel (xlsx) export

### Mevcut dosyalarda
- `src/lib/mobileTabs.ts` — "Yoklama" sekmesi `personnel` rotasına bağlansın; worker için sadece kendi puantajını gösteren read-only view
- `src/lib/projectPermissions.ts` — yeni anahtarlar
- `src/App.tsx` — `/personel`, `/puantaj` rotaları
- Kasa/gider entegrasyonu: `compute_project_labor_cost` çıktısı `project_expenses`'a kategori `"Personel Maliyeti"` olarak SADECE rapor amaçlı görüntülensin — çift kayıt olmaması için ayrı view, INSERT yok. Onaylanmış aya manuel "Kasaya yansıt" butonu (idempotent: source='personnel_payroll', source_id=personnel_id+month)

### Taşeron sözleşme tipi
- `subcontractor_contracts` tablosuna `contract_type` enum: `lump_sum` | `unit_price` | `daily_wage` + ilgili alanlar (`total_amount`, `advance_paid`, `unit_price`, `quantity`). Mevcut tabloyu kontrol edeceğim; yoksa oluşturacağım.

## 3. QR Entegrasyon Akışı

```text
QR check-in (worker_attendance INSERT)
   │
   ▼ trigger
   personnel WHERE phone = normalize(NEW.phone) AND user_id = NEW.user_id
   │
   ├── match → attendance_records UPSERT (status=full_day, source=qr)
   │
   └── no match → unmatched_qr view'da görünür
                  → PersonnelPage'de banner "X tanımsız giriş, kişiyi ekle"
```

## 4. RBAC görünürlüğü

| Rol | Liste | Puantaj giriş | Maliyet |
|---|---|---|---|
| owner | ✓ | ✓ | ✓ |
| manager | ✓ | ✓ | ✓ (override ile kapatılabilir) |
| accountant | ✓ | ✗ | ✓ |
| site_engineer | ✓ | ✓ | ✗ |
| subcontractor | sadece kendi ekibi | ✗ | ✗ |
| worker | sadece kendisi | ✗ | ✗ |

## 5. Uygulama Sırası

1. **Migration** (onay bekle): tablolar + enum + trigger + RPC + RLS + GRANT + projectPermissions seed
2. Hook'lar + lib (`usePersonnel`, `useAttendanceGrid`, `laborCost`)
3. Personel listesi + form (çalışma tipine göre dinamik alan)
4. Aylık ızgara (desktop) + mobil günlük giriş
5. Maliyet özeti + Kasa entegrasyonu (idempotent buton)
6. PDF/Excel export
7. QR trigger testi + unmatched banner
8. Route/mobil tab güncellemesi

Onay verirsen migration ile başlıyorum.
