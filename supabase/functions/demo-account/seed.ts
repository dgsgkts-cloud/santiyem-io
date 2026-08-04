// Seeder for the shared demo tenant. Runs with the service role.
// Every record is owned by the demo user, so RLS keeps it isolated.
import {
  DEMO_COMPANY,
  MATERIALS,
  PERSONNEL,
  PROJECTS,
  SUBCONTRACTORS,
  SUPPLIERS,
  WAREHOUSES,
  day,
  ts,
} from "./dataset.ts";

type SB = any;

const must = (label: string, res: { data?: any; error?: any }) => {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data;
};

export async function seedDemoTenant(sb: SB, userId: string) {
  const summary: Record<string, number> = {};
  const count = (k: string, rows: any[] | null) => {
    summary[k] = (summary[k] || 0) + (rows?.length || 0);
  };

  /* ── Projects ─────────────────────────────────────────── */
  const projectRows = must(
    "projects",
    await sb.from("projects").insert(
      PROJECTS.map((p) => ({
        user_id: userId,
        name: p.name,
        client: p.client,
        location: p.location,
        manager: p.manager,
        site_responsible: p.site_responsible,
        description: p.description,
        budget: p.budget,
        contract_amount: p.contract_amount,
        start_date: day(p.start),
        end_date: day(p.end),
        status: p.status,
        status_color: p.status_color,
        progress: p.progress,
      })),
    ).select("id, name"),
  );
  count("projects", projectRows);
  const P: Record<string, { id: string; name: string }> = {};
  PROJECTS.forEach((p, i) => (P[p.key] = projectRows[i]));

  /* ── Warehouses ───────────────────────────────────────── */
  const warehouseRows = must(
    "warehouses",
    await sb.from("warehouses").insert(
      WAREHOUSES.map((w) => ({
        user_id: userId,
        code: w.code,
        name: w.name,
        warehouse_type: w.warehouse_type,
        manager_name: w.manager_name,
        location: w.location,
        project_id: (w as any).projectKey ? P[(w as any).projectKey].id : null,
        capacity_type: w.capacity_type,
        capacity_value: w.capacity_value,
        capacity_unit: w.capacity_unit,
        is_active: true,
      })),
    ).select("id, code"),
  );
  count("warehouses", warehouseRows);
  const W: Record<string, string> = {};
  WAREHOUSES.forEach((w, i) => (W[w.key] = warehouseRows[i].id));

  /* ── Materials ────────────────────────────────────────── */
  const materialRows = must(
    "materials",
    await sb.from("materials").insert(
      MATERIALS.map((m, i) => ({
        user_id: userId,
        project_id: i % 2 === 0 ? P.arsuz.id : P.antakya.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        category: m.category,
        stock_type: m.stock_type,
        min_stock: m.min_stock,
        safety_stock: m.safety_stock,
        reorder_point: m.reorder_point,
        default_supplier: m.supplier,
        default_warehouse_id: W.merkez,
        allowed_units: [m.unit],
        is_active: true,
      })),
    ).select("id, code"),
  );
  count("materials", materialRows);
  const M: Record<string, string> = {};
  MATERIALS.forEach((m, i) => (M[m.key] = materialRows[i].id));
  const matCost: Record<string, number> = {};
  MATERIALS.forEach((m) => (matCost[m.key] = m.cost));

  /* ── Personnel + project assignments ──────────────────── */
  const personnelRows = must(
    "personnel",
    await sb.from("personnel").insert(
      PERSONNEL.map((p) => ({
        user_id: userId,
        full_name: p.full_name,
        occupation: p.occupation,
        title: p.title || null,
        employment_type: p.employment_type,
        daily_wage: p.daily_wage,
        monthly_salary: p.monthly_salary,
        is_active: true,
        phone: null,
      })),
    ).select("id, full_name"),
  );
  count("personnel", personnelRows);

  const assignments = PERSONNEL.map((p, i) => ({
    user_id: userId,
    personnel_id: personnelRows[i].id,
    project_id: P[p.projectKey].id,
    salary_share_percent: 100,
    is_active: true,
  }));
  count("personnel_project_assignments", must("assignments", await sb.from("personnel_project_assignments").insert(assignments).select("id")));

  /* ── Attendance (puantaj) — last 12 working days ──────── */
  const attendance: any[] = [];
  for (let d = 1; d <= 12; d++) {
    const date = day(-d);
    if (new Date(date).getDay() === 0) continue;
    PERSONNEL.forEach((p, i) => {
      const status = (i + d) % 11 === 0 ? "absent" : (i + d) % 17 === 0 ? "half_day" : "full_day";
      attendance.push({
        user_id: userId,
        personnel_id: personnelRows[i].id,
        project_id: P[p.projectKey].id,
        work_date: date,
        status,
        source: "manual",
      });
    });
  }
  count("attendance_records", must("attendance", await sb.from("attendance_records").insert(attendance).select("id")));

  // Today's live site presence at Arsuz (QR check-ins, still on site).
  const onSiteToday = PERSONNEL.map((p, i) => ({ p, i })).filter(({ p }) => p.projectKey === "arsuz");
  count(
    "worker_attendance",
    must(
      "worker_attendance",
      await sb.from("worker_attendance").insert(
        onSiteToday.map(({ p }) => ({
          user_id: userId,
          project_id: P.arsuz.id,
          qr_token: `demo-${p.full_name.toLowerCase().replace(/\s+/g, "-")}`,
          full_name: p.full_name,
          occupation: p.occupation,
          title: p.title || null,
          entry_type: "personnel",
          team_size: 1,
          check_in: ts(0),
        })),
      ).select("id"),
    ),
  );

  /* ── Subcontractors + suppliers ───────────────────────── */
  const subRows = must(
    "subcontractors",
    await sb.from("subcontractors").insert([
      ...SUBCONTRACTORS.map((s) => ({
        user_id: userId,
        name: s.name,
        specialty: s.specialty,
        contact_person: s.contact_person,
        phone: s.phone,
        project_id: P[s.projectKey].id,
        project_ids: [P[s.projectKey].id],
        contract_amount: s.contract_amount,
        description: "Taşeron sözleşmesi",
      })),
      ...SUPPLIERS.map((s) => ({
        user_id: userId,
        name: s.name,
        specialty: s.specialty,
        contact_person: s.contact_person,
        phone: s.phone,
        project_id: P.antakya.id,
        project_ids: [P.antakya.id],
        contract_amount: 0,
        description: "Tedarikçi",
      })),
    ]).select("id, name"),
  );
  count("subcontractors_and_suppliers", subRows);
  const S: Record<string, string> = {};
  SUBCONTRACTORS.forEach((s, i) => (S[s.key] = subRows[i].id));

  const subPayments: any[] = [];
  SUBCONTRACTORS.forEach((s) => {
    s.paid.forEach((amount, idx) => {
      subPayments.push({
        user_id: userId,
        subcontractor_id: S[s.key],
        project_id: P[s.projectKey].id,
        amount,
        payment_date: day(-90 + idx * 28),
        planned_date: day(-90 + idx * 28),
        status: "paid",
        payment_method: "Banka Havalesi",
        description: `${s.name} hakediş ödemesi #${idx + 1}`,
      });
    });
    s.planned.forEach((pl, idx) => {
      subPayments.push({
        user_id: userId,
        subcontractor_id: S[s.key],
        project_id: P[s.projectKey].id,
        amount: pl.amount,
        payment_date: day(pl.offset),
        planned_date: day(pl.offset),
        status: "pending",
        payment_method: "Banka Havalesi",
        description: `${s.name} planlı hakediş ödemesi #${idx + 1}`,
      });
    });
  });
  count("subcontractor_payments", must("subcontractor_payments", await sb.from("subcontractor_payments").insert(subPayments).select("id")));

  /* ── Cash accounts, payments, collections, checks ─────── */
  const accountRows = must(
    "cash_accounts",
    await sb.from("cash_accounts").insert([
      { user_id: userId, name: "Ana Banka Hesabı", account_type: "bank", bank_name: "Ziraat Bankası", iban: "TR33 0001 0012 3456 7890 1234 56", branch: "Antakya", balance: 18450000 },
      { user_id: userId, name: "Şantiye Kasası", account_type: "cash", balance: 385000 },
      { user_id: userId, name: "Yatırım Hesabı", account_type: "bank", bank_name: "İş Bankası", iban: "TR61 0006 4000 0011 2233 4455 66", branch: "İskenderun", balance: 6200000 },
    ]).select("id, name"),
  );
  count("cash_accounts", accountRows);
  const ACC = accountRows[0].id;
  const CASH = accountRows[1].id;

  const payments = [
    { recipient: "Çelik Demir Ltd.", category: "Malzeme", amount: 2450000, offset: -22, status: "paid", project: P.arsuz.id },
    { recipient: "BetonPlus A.Ş.", category: "Malzeme", amount: 1840000, offset: -14, status: "paid", project: P.arsuz.id },
    { recipient: "Ahmet Yapı", category: "Taşeron", amount: 2800000, offset: -8, status: "paid", project: P.arsuz.id },
    { recipient: "Nurçim A.Ş.", category: "Malzeme", amount: 962500, offset: -5, status: "pending", project: P.antakya.id },
    { recipient: "Elektromax", category: "Taşeron", amount: 2100000, offset: 15, status: "pending", project: P.antakya.id },
    { recipient: "AkarSu Mekanik", category: "Taşeron", amount: 900000, offset: -6, status: "pending", project: P.iskenderun.id },
    { recipient: "İzoTeknik", category: "Malzeme", amount: 412000, offset: -3, status: "pending", project: P.antakya.id },
    { recipient: "Personel Maaş Ödemesi", category: "Personel", amount: 1435000, offset: -2, status: "paid", project: P.antakya.id },
    { recipient: "Renk Boya", category: "Malzeme", amount: 288000, offset: 6, status: "pending", project: P.antakya.id },
    { recipient: "SGK Primleri", category: "Vergi/SGK", amount: 745000, offset: 9, status: "pending", project: P.arsuz.id },
  ];
  count(
    "cash_payments",
    must(
      "cash_payments",
      await sb.from("cash_payments").insert(
        payments.map((p) => ({
          user_id: userId,
          payment_date: day(p.offset),
          recipient: p.recipient,
          category: p.category,
          project_id: p.project,
          amount: p.amount,
          payment_type: "havale",
          status: p.status,
          account_id: p.category === "Personel" ? CASH : ACC,
          description: `${p.recipient} — ${p.category} ödemesi`,
        })),
      ).select("id"),
    ),
  );

  const collections = [
    { sender: "Arsuz Yapı Kooperatifi", amount: 8500000, offset: 2, status: "pending", project: P.arsuz.id },
    { sender: "Antakya Ticaret A.Ş.", amount: 12400000, offset: 5, status: "pending", project: P.antakya.id },
    { sender: "Deniz Ailesi", amount: 2600000, offset: 6, status: "pending", project: P.iskenderun.id },
    { sender: "Arsuz Yapı Kooperatifi", amount: 7800000, offset: 21, status: "pending", project: P.arsuz.id },
    { sender: "Antakya Ticaret A.Ş.", amount: 11200000, offset: -18, status: "received", project: P.antakya.id },
    { sender: "Hatay İl Milli Eğitim Md.", amount: 5400000, offset: -46, status: "received", project: P.defne.id },
  ];
  count(
    "cash_collections",
    must(
      "cash_collections",
      await sb.from("cash_collections").insert(
        collections.map((c) => ({
          user_id: userId,
          collection_date: day(c.offset),
          sender: c.sender,
          collection_type: "Hakediş",
          project_id: c.project,
          amount: c.amount,
          payment_type: "havale",
          status: c.status,
          account_id: ACC,
          description: `${c.sender} hakediş tahsilatı`,
        })),
      ).select("id"),
    ),
  );

  count(
    "cash_checks",
    must(
      "cash_checks",
      await sb.from("cash_checks").insert([
        { user_id: userId, check_type: "payable", check_no: "CK-884512", bank_name: "Garanti BBVA", counterparty: "Çelik Demir Ltd.", amount: 1850000, due_date: day(11), project_id: P.arsuz.id, status: "pending" },
        { user_id: userId, check_type: "payable", check_no: "CK-884513", bank_name: "Akbank", counterparty: "Nurçim A.Ş.", amount: 960000, due_date: day(24), project_id: P.antakya.id, status: "pending" },
        { user_id: userId, check_type: "receivable", check_no: "CK-771290", bank_name: "Ziraat Bankası", counterparty: "Antakya Ticaret A.Ş.", amount: 4200000, due_date: day(17), project_id: P.antakya.id, status: "pending" },
      ]).select("id"),
    ),
  );

  /* ── Progress payments (hakediş) ──────────────────────── */
  const hakedisDefs = [
    { project: P.arsuz.id, period: "2026-05", gross: 9400000, status: "Onaylandı", approval: "approved", offset: -40 },
    { project: P.arsuz.id, period: "2026-06", gross: 10250000, status: "Onay Bekliyor", approval: "pending", offset: -6 },
    { project: P.antakya.id, period: "2026-06", gross: 13800000, status: "Onay Bekliyor", approval: "pending", offset: -4 },
    { project: P.antakya.id, period: "2026-05", gross: 12100000, status: "Ödendi", approval: "approved", offset: -35 },
    { project: P.iskenderun.id, period: "2026-06", gross: 3450000, status: "Taslak", approval: "draft", offset: -2 },
  ];
  const hakedisRows = must(
    "project_hakedis",
    await sb.from("project_hakedis").insert(
      hakedisDefs.map((h) => {
        const kdv = Math.round(h.gross * 0.2);
        const deductions = Math.round(h.gross * 0.05);
        return {
          user_id: userId,
          project_id: h.project,
          period: h.period,
          amount: h.gross,
          kdv,
          net: h.gross + kdv - deductions,
          gross_total: h.gross,
          deductions_total: deductions,
          net_total: h.gross + kdv - deductions,
          status: h.status,
          approval_status: h.approval,
          expected_payment_date: day(h.offset + 30),
          created_at: ts(h.offset),
        };
      }),
    ).select("id"),
  );
  count("project_hakedis", hakedisRows);

  const hakedisItems: any[] = [];
  hakedisRows.forEach((h: any, idx: number) => {
    [
      { poz: "15.185.1002", description: "C30/37 beton dökülmesi", unit: "m3", qty: 420 + idx * 30, price: 2450 },
      { poz: "15.140.1101", description: "Nervürlü çelik hasır imalatı", unit: "ton", qty: 38 + idx * 4, price: 27500 },
      { poz: "15.180.1004", description: "Ahşap kalıp yapılması", unit: "m2", qty: 1450 + idx * 90, price: 460 },
    ].forEach((it, i) => {
      hakedisItems.push({
        hakedis_id: h.id,
        user_id: userId,
        poz_no: it.poz,
        description: it.description,
        unit: it.unit,
        quantity: it.qty,
        current_qty: it.qty,
        cumulative_qty: it.qty,
        previous_cumulative_qty: 0,
        unit_price: it.price,
        total_price: it.qty * it.price,
        sort_order: i,
      });
    });
  });
  count("hakedis_items", must("hakedis_items", await sb.from("hakedis_items").insert(hakedisItems).select("id")));

  /* ── Procurement chain: order → delivery → receipt → stock ── */
  const orderDefs = [
    {
      key: "ord1", supplier: "Çelik Demir Ltd.", project: P.arsuz, category: "Demir", requestNo: "TAL-2026-014",
      order_status: "Tamamlandı", payment_status: "Ödendi", delivery_status: "Teslim Edildi", invoice_status: "Eşleştirildi",
      offset: -26,
      items: [{ key: "demir12", qty: 42, price: 24500 }, { key: "demir16", qty: 26, price: 24200 }],
      delivery: { status: "Tamamlandı", dispatch: -22, arrival: -20, actual: -20 },
    },
    {
      key: "ord2", supplier: "Nurçim A.Ş.", project: P.antakya, category: "Çimento", requestNo: "TAL-2026-021",
      order_status: "Kısmi Teslimat", payment_status: "Kısmen Ödendi", delivery_status: "Kısmi Teslim", invoice_status: "Fatura Geldi",
      offset: -12,
      items: [{ key: "cimento", qty: 180, price: 3850 }],
      delivery: { status: "Kısmi Teslim", dispatch: -9, arrival: -7, actual: -7 },
    },
    {
      key: "ord3", supplier: "İzoTeknik", project: P.antakya, category: "Yalıtım", requestNo: "TAL-2026-027",
      order_status: "Tedarikçiye Gönderildi", payment_status: "Ödeme Planlandı", delivery_status: "Yolda", invoice_status: "Fatura Bekleniyor",
      offset: -5,
      items: [{ key: "xps", qty: 1600, price: 165 }],
      delivery: { status: "Yolda", dispatch: -2, arrival: -1, actual: null },
    },
    {
      key: "ord4", supplier: "Toprak Tuğla", project: P.iskenderun, category: "Duvar", requestNo: "TAL-2026-031",
      order_status: "Onay Bekliyor", payment_status: "Planlanmadı", delivery_status: "Planlanmadı", invoice_status: "Fatura Bekleniyor",
      offset: -1,
      items: [{ key: "tugla", qty: 9000, price: 18.5 }],
      delivery: null,
    },
  ];

  const supplierIdByName: Record<string, string> = {};
  subRows.forEach((r: any) => (supplierIdByName[r.name] = r.id));

  const orderIds: Record<string, string> = {};
  for (const o of orderDefs) {
    const subtotal = o.items.reduce((s, it) => s + it.qty * it.price, 0);
    const vat = Math.round(subtotal * 0.2);
    const order = must(
      "purchase_orders",
      await sb.from("purchase_orders").insert({
        user_id: userId,
        order_no: `SIP-2026-${String(orderDefs.indexOf(o) + 101)}`,
        purchase_request_no: o.requestNo,
        supplier_id: supplierIdByName[o.supplier] ?? null,
        supplier_name: o.supplier,
        project_id: o.project.id,
        project_name: o.project.name,
        category: o.category,
        owner_name: "Demo Yönetici",
        order_date: day(o.offset),
        expected_delivery_date: day(o.offset + 10),
        payment_terms: "30 gün vadeli",
        delivery_address: o.project.name,
        currency: "TRY",
        subtotal,
        discount: 0,
        vat_rate: 20,
        vat_amount: vat,
        total: subtotal + vat,
        order_status: o.order_status,
        payment_status: o.payment_status,
        delivery_status: o.delivery_status,
        invoice_status: o.invoice_status,
        created_by: "Demo Yönetici",
        approved_at: o.order_status === "Onay Bekliyor" ? null : ts(o.offset + 1),
        approved_by: o.order_status === "Onay Bekliyor" ? null : "Demo Yönetici",
        submitted_for_approval_at: ts(o.offset),
        notes: `${o.requestNo} numaralı satın alma talebinden oluşturuldu.`,
      }).select("id").single(),
    );
    orderIds[o.key] = order.id;
    summary.purchase_orders = (summary.purchase_orders || 0) + 1;

    const itemRows = must(
      "purchase_order_items",
      await sb.from("purchase_order_items").insert(
        o.items.map((it, i) => ({
          order_id: order.id,
          name: MATERIALS.find((m) => m.key === it.key)!.name,
          item_type: "malzeme",
          material_id: M[it.key],
          quantity: it.qty,
          unit: MATERIALS.find((m) => m.key === it.key)!.unit,
          unit_price: it.price,
          vat_rate: 20,
          line_total: it.qty * it.price,
          delivered_quantity: o.delivery?.status === "Tamamlandı" ? it.qty : o.delivery?.status === "Kısmi Teslim" ? Math.round(it.qty * 0.6) : 0,
          accepted_quantity: o.delivery?.status === "Tamamlandı" ? it.qty : o.delivery?.status === "Kısmi Teslim" ? Math.round(it.qty * 0.6) : 0,
          warehouse_name: WAREHOUSES[0].name,
          sort_order: i,
        })),
      ).select("id"),
    );
    count("purchase_order_items", itemRows);

    if (o.delivery) {
      const delivery = must(
        "purchase_order_deliveries",
        await sb.from("purchase_order_deliveries").insert({
          order_id: order.id,
          delivery_no: `TES-2026-${String(orderDefs.indexOf(o) + 201)}`,
          carrier: "Hatay Lojistik",
          vehicle_plate: `31 ABC ${100 + orderDefs.indexOf(o)}`,
          driver_name: "Hüseyin Ak",
          driver_phone: "0532 700 11 22",
          waybill_no: `IRS-${9100 + orderDefs.indexOf(o)}`,
          dispatch_date: day(o.delivery.dispatch),
          dispatched_at: ts(o.delivery.dispatch),
          expected_arrival: day(o.delivery.arrival),
          actual_arrival: o.delivery.actual !== null ? day(o.delivery.actual) : null,
          arrived_at: o.delivery.actual !== null ? ts(o.delivery.actual) : null,
          project_id: o.project.id,
          warehouse_name: WAREHOUSES[0].name,
          destination: o.project.name,
          status: o.delivery.status,
          created_by: "Demo Yönetici",
        }).select("id").single(),
      );
      summary.purchase_order_deliveries = (summary.purchase_order_deliveries || 0) + 1;

      count(
        "purchase_order_delivery_items",
        must(
          "purchase_order_delivery_items",
          await sb.from("purchase_order_delivery_items").insert(
            o.items.map((it, i) => {
              const delivered = o.delivery!.status === "Tamamlandı" ? it.qty : Math.round(it.qty * 0.6);
              return {
                delivery_id: delivery.id,
                order_item_id: itemRows[i].id,
                delivered_quantity: o.delivery!.status === "Yolda" ? 0 : delivered,
                accepted_quantity: o.delivery!.status === "Yolda" ? 0 : delivered,
                rejected_quantity: 0,
                damaged_quantity: 0,
                warehouse_name: WAREHOUSES[0].name,
              };
            }),
          ).select("id"),
        ),
      );
    }

    if (o.payment_status === "Ödendi" || o.payment_status === "Kısmen Ödendi") {
      const paid = o.payment_status === "Ödendi" ? subtotal + vat : Math.round((subtotal + vat) * 0.4);
      count(
        "purchase_order_payments",
        must(
          "purchase_order_payments",
          await sb.from("purchase_order_payments").insert({
            order_id: order.id,
            account_id: ACC,
            amount: paid,
            currency: "TRY",
            payment_date: day(o.offset + 6),
            method: "Banka Havalesi",
            reference_no: `HVL-${5500 + orderDefs.indexOf(o)}`,
            description: `${o.supplier} sipariş ödemesi`,
            created_by: "Demo Yönetici",
          }).select("id"),
        ),
      );
    }
  }

  /* ── Stock ledger ─────────────────────────────────────── */
  const movements: any[] = [];
  let mvNo = 1;
  const addMovement = (row: any) => {
    movements.push({
      user_id: userId,
      actor_id: userId,
      movement_no: `HRK-2026-${String(1000 + mvNo++)}`,
      ...row,
    });
  };

  // Goods receipts from the completed / partially delivered orders.
  addMovement({ movement_type: "goods_receipt", reason: "Sipariş mal kabulü", direction: 1, material_id: M.demir12, warehouse_id: W.merkez, quantity: 42, unit: "ton", unit_cost: 24500, total_cost: 42 * 24500, supplier: "Çelik Demir Ltd.", project_id: P.arsuz.id, source_type: "purchase_order", source_document: "SIP-2026-101", transaction_date: day(-20), posted_at: ts(-20) });
  addMovement({ movement_type: "goods_receipt", reason: "Sipariş mal kabulü", direction: 1, material_id: M.demir16, warehouse_id: W.merkez, quantity: 26, unit: "ton", unit_cost: 24200, total_cost: 26 * 24200, supplier: "Çelik Demir Ltd.", project_id: P.arsuz.id, source_type: "purchase_order", source_document: "SIP-2026-101", transaction_date: day(-20), posted_at: ts(-20) });
  addMovement({ movement_type: "goods_receipt", reason: "Sipariş mal kabulü (kısmi)", direction: 1, material_id: M.cimento, warehouse_id: W.merkez, quantity: 108, unit: "ton", unit_cost: 3850, total_cost: 108 * 3850, supplier: "Nurçim A.Ş.", project_id: P.antakya.id, source_type: "purchase_order", source_document: "SIP-2026-102", transaction_date: day(-7), posted_at: ts(-7) });
  addMovement({ movement_type: "manual_entry", reason: "Açılış stoğu", direction: 1, material_id: M.tugla, warehouse_id: W.merkez, quantity: 14000, unit: "adet", unit_cost: 18.5, total_cost: 14000 * 18.5, supplier: "Toprak Tuğla", transaction_date: day(-45), posted_at: ts(-45) });
  addMovement({ movement_type: "manual_entry", reason: "Açılış stoğu", direction: 1, material_id: M.kereste, warehouse_id: W.merkez, quantity: 32, unit: "m3", unit_cost: 12800, total_cost: 32 * 12800, supplier: "Ahşap Yapı", transaction_date: day(-45), posted_at: ts(-45) });
  addMovement({ movement_type: "manual_entry", reason: "Açılış stoğu", direction: 1, material_id: M.kablo, warehouse_id: W.merkez, quantity: 4200, unit: "m", unit_cost: 42, total_cost: 4200 * 42, supplier: "Elektromax", transaction_date: day(-40), posted_at: ts(-40) });
  addMovement({ movement_type: "manual_entry", reason: "Açılış stoğu", direction: 1, material_id: M.boya, warehouse_id: W.merkez, quantity: 900, unit: "kg", unit_cost: 96, total_cost: 900 * 96, supplier: "Renk Boya", transaction_date: day(-38), posted_at: ts(-38) });
  addMovement({ movement_type: "manual_entry", reason: "Açılış stoğu", direction: 1, material_id: M.xps, warehouse_id: W.merkez, quantity: 2100, unit: "m2", unit_cost: 165, total_cost: 2100 * 165, supplier: "İzoTeknik", transaction_date: day(-36), posted_at: ts(-36) });

  // Project issues (consumption) — several per material so forecasts have history.
  for (let i = 1; i <= 6; i++) {
    addMovement({ movement_type: "project_issue", reason: "Şantiyeye sevk", direction: -1, material_id: M.demir12, warehouse_id: W.merkez, quantity: 3.2, unit: "ton", unit_cost: 24500, total_cost: 3.2 * 24500, project_id: P.arsuz.id, person: "Ahmet Doğan", transaction_date: day(-2 * i), posted_at: ts(-2 * i) });
    addMovement({ movement_type: "project_issue", reason: "Şantiyeye sevk", direction: -1, material_id: M.cimento, warehouse_id: W.merkez, quantity: 6, unit: "ton", unit_cost: 3850, total_cost: 6 * 3850, project_id: P.antakya.id, person: "Cem Erdem", transaction_date: day(-2 * i), posted_at: ts(-2 * i) });
    addMovement({ movement_type: "project_issue", reason: "Şantiyeye sevk", direction: -1, material_id: M.tugla, warehouse_id: W.merkez, quantity: 950, unit: "adet", unit_cost: 18.5, total_cost: 950 * 18.5, project_id: P.antakya.id, person: "Cem Erdem", transaction_date: day(-2 * i - 1), posted_at: ts(-2 * i - 1) });
  }

  // Completed transfer (merkez → saha) recorded on both sides.
  addMovement({ movement_type: "transfer_out", reason: "Depo transferi", direction: -1, material_id: M.kereste, warehouse_id: W.merkez, counter_warehouse_id: W.saha, quantity: 8, unit: "m3", unit_cost: 12800, total_cost: 8 * 12800, transaction_date: day(-10), posted_at: ts(-10), source_document: "TRF-2026-001" });
  addMovement({ movement_type: "transfer_in", reason: "Depo transferi", direction: 1, material_id: M.kereste, warehouse_id: W.saha, counter_warehouse_id: W.merkez, quantity: 8, unit: "m3", unit_cost: 12800, total_cost: 8 * 12800, transaction_date: day(-9), posted_at: ts(-9), source_document: "TRF-2026-001" });
  // In-transit transfer: only the outbound leg is posted.
  addMovement({ movement_type: "transfer_out", reason: "Depo transferi (yolda)", direction: -1, material_id: M.demir12, warehouse_id: W.merkez, counter_warehouse_id: W.saha, quantity: 6, unit: "ton", unit_cost: 24500, total_cost: 6 * 24500, transaction_date: day(-1), posted_at: ts(-1), source_document: "TRF-2026-002" });

  count("stock_movements", must("stock_movements", await sb.from("stock_movements").insert(movements).select("id")));

  /* ── Warehouse transfers ──────────────────────────────── */
  const transferRows = must(
    "inventory_transfers",
    await sb.from("inventory_transfers").insert([
      {
        user_id: userId, transfer_no: "TRF-2026-001", material_id: M.kereste, unit: "m3",
        requested_quantity: 8, dispatched_quantity: 8, received_quantity: 8, in_transit_quantity: 0,
        unit_cost: 12800, source_warehouse_id: W.merkez, dest_warehouse_id: W.saha,
        project_id: P.arsuz.id, requester_id: userId, approver_id: userId, dispatcher_id: userId, receiver_id: userId,
        requested_at: ts(-12), approved_at: ts(-11), dispatched_at: ts(-10), received_at: ts(-9),
        required_date: day(-9), status: "received", reason: "Şantiye kalıp imalatı", notes: "Eksiksiz teslim alındı.",
      },
      {
        user_id: userId, transfer_no: "TRF-2026-002", material_id: M.demir12, unit: "ton",
        requested_quantity: 6, dispatched_quantity: 6, received_quantity: 0, in_transit_quantity: 6,
        unit_cost: 24500, source_warehouse_id: W.merkez, dest_warehouse_id: W.saha,
        project_id: P.arsuz.id, requester_id: userId, approver_id: userId, dispatcher_id: userId,
        requested_at: ts(-3), approved_at: ts(-2), dispatched_at: ts(-1), expected_arrival: day(1),
        required_date: day(1), status: "in_transit", reason: "Perde donatısı", notes: "Araç yolda.",
      },
      {
        user_id: userId, transfer_no: "TRF-2026-003", material_id: M.cimento, unit: "ton",
        requested_quantity: 14, dispatched_quantity: 0, received_quantity: 0, in_transit_quantity: 0, unit_cost: 3850,
        source_warehouse_id: W.merkez, dest_warehouse_id: W.saha,
        project_id: P.arsuz.id, requester_id: userId,
        requested_at: ts(-1), required_date: day(4), status: "pending_approval", reason: "Şap imalatı",
      },
    ]).select("id"),
  );
  count("inventory_transfers", transferRows);

  /* ── Tasks (active + delayed) ─────────────────────────── */
  const tasks = [
    { project: P.arsuz.id, title: "B Blok 3. kat perde donatı kontrolü", status: "in_progress", priority: "high", due: 2 },
    { project: P.arsuz.id, title: "Sahil istinat duvarı beton dökümü", status: "todo", priority: "urgent", due: -3 },
    { project: P.arsuz.id, title: "Vinç periyodik bakım raporu", status: "todo", priority: "normal", due: -6 },
    { project: P.antakya.id, title: "Cephe kaplama metraj revizyonu", status: "in_progress", priority: "high", due: 4 },
    { project: P.antakya.id, title: "Elektrik pano yerleşim onayı", status: "todo", priority: "urgent", due: -2 },
    { project: P.antakya.id, title: "Mekanik şaft yalıtım imalatı", status: "todo", priority: "normal", due: 8 },
    { project: P.iskenderun.id, title: "Villa 3 temel hafriyat kontrolü", status: "done", priority: "normal", due: -12 },
    { project: P.iskenderun.id, title: "Peyzaj projesi tedarikçi teklifi", status: "todo", priority: "low", due: 12 },
    { project: P.iskenderun.id, title: "İSG eğitimi planlaması", status: "todo", priority: "high", due: -1 },
  ];
  count(
    "tasks",
    must(
      "tasks",
      await sb.from("tasks").insert(
        tasks.map((t, i) => ({
          project_id: t.project,
          title: t.title,
          description: "Demo veri seti — gerçek işlem yapılabilir.",
          status: t.status,
          priority: t.priority,
          due_date: day(t.due),
          created_by: userId,
          sort_order: i,
        })),
      ).select("id"),
    ),
  );

  /* ── Site diaries ─────────────────────────────────────── */
  const diaries = [
    { project: P.arsuz.id, offset: -1, work: "B Blok 3. kat perde kalıp ve donatı imalatı yapıldı.", temp: 29 },
    { project: P.arsuz.id, offset: -2, work: "A Blok döşeme betonu döküldü (180 m3 C30/37).", temp: 31 },
    { project: P.antakya.id, offset: -1, work: "2. bodrum mekanik tesisat askı montajı devam etti.", temp: 27 },
    { project: P.iskenderun.id, offset: -3, work: "Villa 2 temel grobeton imalatı tamamlandı.", temp: 30 },
  ];
  count(
    "site_diary_entries",
    must(
      "site_diary_entries",
      await sb.from("site_diary_entries").insert(
        diaries.map((d) => ({
          user_id: userId,
          project_id: d.project,
          entry_date: day(d.offset),
          weather_icon: "sun",
          weather_temp: d.temp,
          work_status: "working",
          work_done: d.work,
          crews: [{ name: "Kalıp Ekibi", count: 8 }, { name: "Demir Ekibi", count: 6 }],
          materials: [{ name: "Hazır Beton C30/37", qty: 180, unit: "m3" }],
          machines: [{ name: "Kule Vinç", hours: 8 }],
          status: "published",
        })),
      ).select("id"),
    ),
  );

  /* ── Documents, milestones, expenses, reminders ───────── */
  count(
    "documents",
    must(
      "documents",
      await sb.from("documents").insert([
        { user_id: userId, name: "Arsuz Sahil Konutları - Sözleşme.pdf", doc_type: "sozlesme", project_id: P.arsuz.id, supplier: "Arsuz Yapı Kooperatifi", doc_date: day(-320), status: "ready", file_size: 482000, page_count: 24, tags: ["sözleşme"] },
        { user_id: userId, name: "Antakya TM - Statik Proje Revizyon 3.pdf", doc_type: "proje", project_id: P.antakya.id, doc_date: day(-92), status: "ready", file_size: 3120000, page_count: 58, tags: ["proje", "statik"] },
        { user_id: userId, name: "Çelik Demir Ltd - Fatura 2026-4471.pdf", doc_type: "fatura", project_id: P.arsuz.id, supplier: "Çelik Demir Ltd.", doc_date: day(-20), status: "ready", file_size: 128000, page_count: 1, tags: ["fatura"] },
        { user_id: userId, name: "İSG Risk Değerlendirme Raporu.pdf", doc_type: "rapor", project_id: P.antakya.id, doc_date: day(-60), status: "ready", file_size: 640000, page_count: 12, tags: ["isg"] },
      ]).select("id"),
    ),
  );

  count(
    "project_milestones",
    must(
      "project_milestones",
      await sb.from("project_milestones").insert([
        { user_id: userId, project_id: P.arsuz.id, title: "A Blok kaba yapı bitişi", milestone_date: day(35), completed: false, sort_order: 0 },
        { user_id: userId, project_id: P.arsuz.id, title: "Temel imalatları", milestone_date: day(-180), completed: true, sort_order: 1 },
        { user_id: userId, project_id: P.antakya.id, title: "Cephe montaj başlangıcı", milestone_date: day(18), completed: false, sort_order: 0 },
        { user_id: userId, project_id: P.iskenderun.id, title: "Villa 1-2 betonarme bitişi", milestone_date: day(52), completed: false, sort_order: 0 },
      ]).select("id"),
    ),
  );

  count(
    "project_expenses",
    must(
      "project_expenses",
      await sb.from("project_expenses").insert([
        { user_id: userId, project_id: P.arsuz.id, category: "Malzeme", description: "Demir alımı", amount: 2450000, expense_date: day(-22), has_invoice: true, invoice_no: "2026-4471", source: "purchase_order" },
        { user_id: userId, project_id: P.arsuz.id, category: "Taşeron", description: "Ahmet Yapı hakediş", amount: 2800000, expense_date: day(-8), has_invoice: true, invoice_no: "2026-118", source: "subcontractor" },
        { user_id: userId, project_id: P.antakya.id, category: "Malzeme", description: "Çimento alımı (kısmi teslim)", amount: 415800, expense_date: day(-7), has_invoice: true, invoice_no: "2026-9902", source: "purchase_order" },
        { user_id: userId, project_id: P.antakya.id, category: "Personel", description: "Haziran maaş ödemesi", amount: 1435000, expense_date: day(-2), has_invoice: false, source: "payroll" },
        { user_id: userId, project_id: P.iskenderun.id, category: "Ekipman", description: "Ekskavatör kiralama", amount: 320000, expense_date: day(-11), has_invoice: true, invoice_no: "2026-771", source: "manual" },
      ]).select("id"),
    ),
  );

  count(
    "reminders",
    must(
      "reminders",
      await sb.from("reminders").insert([
        { user_id: userId, title: "Antakya TM hakedişini onaya sun", reminder_date: day(1), note: "13.8M TL tutarındaki hakediş onay bekliyor." },
        { user_id: userId, title: "Çelik Demir çeki vadesi", reminder_date: day(11), note: "CK-884512 — 1.850.000 TL" },
        { user_id: userId, title: "Arsuz tahsilatı takibi", reminder_date: day(2), note: "8.5M TL tahsilat planlandı." },
      ]).select("id"),
    ),
  );

  count(
    "notification_history",
    must(
      "notification_history",
      await sb.from("notification_history").insert([
        { user_id: userId, title: "Teslimat gecikmesi", body: "SIP-2026-103 (İzoTeknik) siparişinin teslimatı beklenen tarihi geçti.", notification_type: "delivery", click_url: "/satin-alma", is_read: false },
        { user_id: userId, title: "Onay bekleyen hakediş", body: "Antakya Ticaret Merkezi 2026-06 hakedişi onayınızı bekliyor.", notification_type: "hakedis", click_url: "/hakedis", is_read: false },
        { user_id: userId, title: "Kritik stok", body: "Portland Çimento CEM I 42.5 stoğu güvenlik seviyesine yaklaştı.", notification_type: "stock", click_url: "/depo", is_read: false },
        { user_id: userId, title: "Geciken ödeme", body: "AkarSu Mekanik planlı ödemesi 6 gün gecikti.", notification_type: "payment", click_url: "/odemeler", is_read: true },
      ]).select("id"),
    ),
  );

  summary.company = 1;
  return { company: DEMO_COMPANY, summary };
}
