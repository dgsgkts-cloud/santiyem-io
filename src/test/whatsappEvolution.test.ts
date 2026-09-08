// Evolution adapter eşlemeleri — iş mantığı Evolution formatını bilmez,
// yalnızca bu adapter bilir. Regresyon koruması için sade birim testler.

import { describe, expect, it } from "vitest";
import {
  buildInstanceName,
  mapMessageStatus,
  mapState,
  toJid,
} from "../../supabase/functions/_shared/whatsapp/evolution.ts";

describe("Evolution durum eşlemesi", () => {
  it("ham durumları sade kullanıcı durumlarına çevirir", () => {
    expect(mapState("open")).toBe("connected");
    expect(mapState("connecting")).toBe("connecting");
    expect(mapState("close")).toBe("disconnected");
    expect(mapState(null)).toBe("disconnected");
    expect(mapState("beklenmeyen")).toBe("disconnected");
  });

  it("yalnızca sağlayıcının verdiği mesaj durumlarını kabul eder", () => {
    expect(mapMessageStatus("SERVER_ACK")).toBe("sent");
    expect(mapMessageStatus("DELIVERY_ACK")).toBe("delivered");
    expect(mapMessageStatus("READ")).toBe("read");
    expect(mapMessageStatus("ERROR")).toBe("failed");
    // Bilinmeyen durum uydurulmaz.
    expect(mapMessageStatus("SOMETHING")).toBeNull();
  });
});

describe("Alıcı normalizasyonu", () => {
  it("telefon numarasını WhatsApp adresine çevirir", () => {
    expect(toJid("+90 533 377 11 56")).toBe("905333771156@s.whatsapp.net");
    expect(toJid("905333771156")).toBe("905333771156@s.whatsapp.net");
  });

  it("geçersiz numarayı reddeder", () => {
    expect(toJid("123")).toBeNull();
    expect(toJid(null)).toBeNull();
  });
});

describe("Instance adı", () => {
  it("tahmin edilebilir kullanıcı adı içermez ve tekildir", () => {
    const a = buildInstanceName("11111111-2222-3333-4444-555555555555");
    const b = buildInstanceName("11111111-2222-3333-4444-555555555555");
    expect(a).toMatch(/^sa_[0-9a-f]{12}_[0-9a-f]{10}$/);
    expect(a).not.toBe(b);
  });
});
