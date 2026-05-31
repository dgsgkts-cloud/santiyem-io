## Şantiyem RBAC Sistemi — Uygulama Planı

Tek proje–çok kullanıcı için rol & yetki sistemi. Sahip aboneliği öder, davet ettiği kişiler altında çalışır. Her kullanıcı yalnızca yetkili olduğu veriyi görür.

---

### 1. Veritabanı Değişiklikleri (Migration)

**Yeni enum:** `project_role` → `owner | manager | site_engineer | accountant | subcontractor | worker | landowner`

**Yeni tablolar:**

- `project_members` — bir kullanıcının bir projedeki rolü
  - `project_id`, `user_id`, `role`, `invited_by`, `joined_at`
  - UNIQUE(project_id, user_id) — çoklu projede farklı rol mümkün
  - `owner` rolü projede tek olur (partial unique index)

- `project_member_permissions` — kişi-bazı ince ayar (varsayılan şablonun üzerine yazar)
  - `project_id`, `user_id`, `permission_key`, `granted boolean`
  - Anahtarlar: `view_financials`, `view_costs`, `view_payments`, `view_diary`, `view_photos`, `view_attendance_all`, `view_progress`, `manage_members`, `manage_finance`...

- `project_invitations` — telefon veya e-posta ile davet
  - `project_id`, `invited_by`, `email`, `phone`, `role`, `token`, `status` (pending/accepted/cancelled), `expires_at`

**Güvenlik fonksiyonları (SECURITY DEFINER, search_path=public):**
- `get_project_role(_user, _project) → project_role`
- `has_project_permission(_user, _project, _key) → boolean` — rol şablonunu + kişi-bazı override'ı birleştirir
- `can_access_project(_user, _project) → boolean` — owner VEYA member VEYA mevcut takım sahibi
- `is_project_owner(_user, _project) → boolean`
- `is_project_manager_or_owner(_user, _project) → boolean`

**Davet RPC'leri:**
- `accept_project_invitation(_token)` — kullanıcının e-posta/telefonuyla davet eşleşirse member ekler
- `set_member_role(_project, _user, _role)` — yalnızca owner; manager kendisini owner yapamaz, kimseyi owner atayamaz
- `set_member_permission(_project, _user, _key, _granted)` — `view_financials` gibi finansal anahtarları YALNIZCA owner değiştirebilir; diğerlerini manager da değiştirebilir
- `remove_project_member(_project, _user)` — owner çıkarılamaz

**RLS — Yeni Erişim Modeli:**
Mevcut `can_access_team_resource` aynen kalır (ofis paylaşımı). Buna ek olarak proje-bağlamlı tablolarda (`project_expenses`, `project_hakedis`, `worker_attendance`, `site_diary`, `materials`, `project_files`, `subcontractor_payments`, vb.) policy'ler güncellenir:

- SELECT: `can_access_team_resource(auth.uid(), user_id) OR can_access_project(auth.uid(), project_id)`
- INSERT/UPDATE/DELETE: rol şablonuna göre (örn. `worker` sadece kendi `worker_attendance` satırını oluşturabilir; `accountant` `site_diary`'yi yazamaz).

Hassas finansal sütunlar (proje kâr/zarar widget'larında kullanılır) için `has_project_permission(uid, pid, 'view_financials')` ek koşulu eklenir.

### 2. Rol Şablonları (frontend + RPC)

Tek bir kaynak: `src/lib/projectPermissions.ts` (DB tarafında `has_project_permission` aynı tabloyu okur).

| Rol | view_financials | view_costs | view_payments | view_diary | view_photos | view_attendance_all | manage_members | manage_finance |
|---|---|---|---|---|---|---|---|---|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| manager | ✗ (varsayılan) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| site_engineer | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| accountant | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| subcontractor | ✗ | ✗ | own | ✗ | ✗ | own_team | ✗ | ✗ |
| worker | ✗ | ✗ | ✗ | ✗ | ✗ | own_only | ✗ | ✗ |
| landowner | ✗ | ✗ | ✗ | ✗ | ✓ (read) | ✗ | ✗ | ✗ |

`view_financials` ve `manage_finance` yalnızca **owner tarafından** override edilebilir (DB içinde RPC zorlar).

### 3. Frontend

**Yeni:**
- `src/hooks/useProjectRole.ts` — aktif proje için rol + permission seti döner
- `src/lib/projectPermissions.ts` — rol şablon sabitleri, `can(role, permKey, overrides)` helper
- `src/components/desktop/ProjectMembersManagement.tsx` — proje üyeleri ekranı (davet, rol değiştir, çıkar, ince ayar toggle)
- `src/pages/InviteAccept.tsx` — `/proje-davet/:token` linki ile katılım

**Güncellenen:**
- `useProjects` — kullanıcının üye olduğu projeleri de listeler (sadece sahip olduklarını değil)
- Mali widget'lar (kâr/zarar, maliyet özeti, ödemeler, taşeron cari): `useProjectRole().can('view_financials')` ile guard
- Şantiye günlüğü, fotoğraf, puantaj panelleri rol bazlı görünürlük
- `TeamManagement` ve yeni proje üyeleri ekranı yan yana çalışır (ofis ekibi ≠ proje üyeleri)

### 4. Faturalama
Mevcut `profiles.plan` Sahibe bağlı kalır. Davet edilen kullanıcı `accept_project_invitation` ile bağlandığında abonelik kontrolü Sahibin `plan`'ı üzerinden yapılır → `useProjectRole` aktif projenin sahibinin planını döner; davetli kullanıcıda upgrade modal/iyzico butonu gizlenir (mevcut `NativeSubscriptionNotice` mantığıyla uyumlu).

### 5. Test Senaryoları
- Worker giriş → sadece kendi yoklaması görünür, kâr/zarar ve diğer işçiler gizli
- Subcontractor → kendi ekibi ve kendisiyle ödemeler
- Manager → üye ekleyebilir, ama kimseyi owner yapamaz; `view_financials` toggle'ı disabled
- Owner → bir manager'a tek tıkla `view_financials` açabilir

### Teknik Notlar
- Tüm yeni tablolarda GRANT + RLS + policy aynı migration'da
- Davet kabulü `auth.email()` veya `auth.jwt()->>phone` ile eşleşmeli
- Mevcut tüm policy'ler bozulmamak için sadece "OR" ile genişletilir, var olan ofis ekibi davranışı korunur

---

Bu büyük bir değişiklik (DB + 20+ dosya). Onaylarsanız migration'la başlayıp adım adım uygulayacağım.
