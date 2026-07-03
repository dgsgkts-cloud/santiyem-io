import jsPDF from "jspdf";

type Meeting = { title: string; started_at?: string | null; location?: string | null };
type Analysis = {
  summary?: string | null;
  decisions?: Array<{ title?: string; detail?: string }>;
  risks?: Array<{ title?: string; impact?: string }>;
  action_items?: Array<{ title?: string; assignee?: string; due_date?: string; priority?: string }>;
  questions?: string[];
  numbers?: Array<{ label?: string; value?: string }>;
};
type Participant = { display_name: string; company?: string | null; role?: string | null };

export function generateMeetingPdf(opts: {
  meeting: Meeting;
  analysis: Analysis | null;
  participants: Participant[];
  projectName?: string | null;
  companyName?: string;
}) {
  const { meeting, analysis, participants, projectName, companyName = "Şantiyem" } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(companyName, 15, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Toplantı Raporu", pageW - 15, y, { align: "right" });
  doc.setTextColor(0);
  y += 10;

  doc.setDrawColor(230);
  doc.line(15, y, pageW - 15, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(meeting.title || "Toplantı", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta: string[] = [];
  if (meeting.started_at) meta.push(`Tarih: ${new Date(meeting.started_at).toLocaleString("tr-TR")}`);
  if (projectName) meta.push(`Proje: ${projectName}`);
  if (meeting.location) meta.push(`Konum: ${meeting.location}`);
  meta.forEach((line) => { doc.text(line, 15, y); y += 5; });
  y += 3;

  const section = (title: string) => {
    if (y > 260) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 107, 43);
    doc.text(title, 15, y);
    doc.setTextColor(0);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };
  const wrap = (t: string) => {
    const lines = doc.splitTextToSize(t, pageW - 30);
    lines.forEach((l: string) => { if (y > 275) { doc.addPage(); y = 18; } doc.text(l, 15, y); y += 5; });
  };

  section("Katılımcılar");
  if (!participants.length) wrap("Katılımcı belirtilmedi.");
  participants.forEach((p) => wrap(`• ${p.display_name}${p.role ? ` — ${p.role}` : ""}${p.company ? ` (${p.company})` : ""}`));
  y += 2;

  if (analysis?.summary) { section("Özet"); wrap(analysis.summary); y += 2; }

  if (analysis?.decisions?.length) {
    section("Kararlar");
    analysis.decisions.forEach((d) => wrap(`• ${d.title || ""}${d.detail ? ` — ${d.detail}` : ""}`));
    y += 2;
  }

  if (analysis?.action_items?.length) {
    section("Aksiyon Maddeleri");
    analysis.action_items.forEach((a) =>
      wrap(`• ${a.title}${a.assignee ? ` — ${a.assignee}` : ""}${a.due_date ? ` (Son tarih: ${a.due_date})` : ""}${a.priority ? ` [${a.priority}]` : ""}`),
    );
    y += 2;
  }

  if (analysis?.risks?.length) {
    section("Riskler");
    analysis.risks.forEach((r) => wrap(`• ${r.title}${r.impact ? ` [${r.impact}]` : ""}`));
    y += 2;
  }

  if (analysis?.questions?.length) {
    section("Açık Sorular");
    analysis.questions.forEach((q) => wrap(`• ${q}`));
    y += 2;
  }

  if (analysis?.numbers?.length) {
    section("Önemli Sayılar");
    analysis.numbers.forEach((n) => wrap(`• ${n.label}: ${n.value}`));
    y += 2;
  }

  if (y > 240) { doc.addPage(); y = 18; }
  y += 10;
  doc.setDrawColor(200);
  doc.line(15, y, 90, y);
  doc.line(pageW - 90, y, pageW - 15, y);
  y += 5;
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text("İmza", 15, y);
  doc.text("İmza", pageW - 15, y, { align: "right" });

  const safe = (meeting.title || "toplanti").replace(/[^\w-]+/g, "_").slice(0, 60);
  doc.save(`${safe}.pdf`);
}
