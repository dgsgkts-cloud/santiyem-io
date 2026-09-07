import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyFull, formatCurrencyShort } from "@/lib/formatCurrency";

interface Snapshot {
  snapshot_date: string;
  forecast_profit: number | string | null;
}

/** "Kârım yükseliyor mu düşüyor mu?" — tek soruyu cevaplayan sade grafik. */
export default function ProfitTrendChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = snapshots.map((s) => ({
    label: new Date(s.snapshot_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    value: Number(s.forecast_profit ?? 0),
  }));

  return (
    <section className="rounded-card border border-border/80 bg-card shadow-card p-5">
      <h3 className="ds-title text-foreground mb-4">Kâr Tahmini</h3>

      {data.length < 2 ? (
        <p className="text-[13px] text-muted-foreground py-2">
          Kâr tahmini eğilimi için henüz yeterli geçmiş kayıt yok. Kayıtlar biriktikçe grafik burada oluşur.
        </p>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={62}
                tickFormatter={(v) => formatCurrencyShort(Number(v))}
              />
              <Tooltip
                formatter={(v) => [formatCurrencyFull(Number(v)), "Tahmini Final Kâr"]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
