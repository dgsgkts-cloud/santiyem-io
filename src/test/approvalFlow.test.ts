import { describe, it, expect } from "vitest";
import { buildApprovalFlow } from "@/components/desktop/procurement/approvalFlow";
const base:any = { id:"1", no:"PR-001", project:"P", category:"C", requester:"Ahmet Yılmaz", priority:"Orta", budget:1, needBy:3, approvalStage:0 };
describe("flow", () => {
  it("all states", () => {
    const cases:any[] = [
      { ...base, status:"Taslak" },
      { ...base, status:"Onay Bekliyor", approverName:"Doğuş Göktaş", approverRole:"Yönetici" },
      { ...base, status:"Onay Bekliyor" },
      { ...base, status:"Onaylandı", approvedBy:"Doğuş Göktaş", approvedAt:new Date().toISOString() },
      { ...base, status:"İptal", rejectedBy:"Doğuş Göktaş", rejectionReason:"Bütçe uygun değil" },
      { ...base, status:"İptal" },
      { ...base, status:"Sipariş Verildi", orderNo:"PO-001" },
    ];
    for (const c of cases) {
      const f = buildApprovalFlow(c);
      console.log(c.status, "|", `${f.completed}/${f.total}`, "|", f.currentLabel, "|", f.percent+"%", "|", f.stages.map(s=>`${s.label}:${s.state}`).join(", "));
      expect(f.stages.every(s=>!s.label.includes("…"))).toBe(true);
    }
  });
});
