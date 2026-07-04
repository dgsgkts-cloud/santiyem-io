// AIBarChart / AILineChart / AIPieChart — recharts wrappers for ui payloads.
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export type ChartPoint = { name: string; value: number };

const PALETTE = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6", "#eab308"];

const Frame = ({ title, children, tag }: { title?: string; children: React.ReactNode; tag: string }) => (
  <div data-ai-component={tag} className="rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm">
    {title && <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
    <div className="h-64 w-full">{children}</div>
  </div>
);

const tooltipStyle = { background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };

export const AIBarChart = ({ title, data }: { title?: string; data: ChartPoint[] }) => (
  <Frame tag="AIBarChart" title={title}>
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </Frame>
);

export const AILineChart = ({ title, data }: { title?: string; data: ChartPoint[] }) => (
  <Frame tag="AILineChart" title={title}>
    <ResponsiveContainer>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </Frame>
);

export const AIPieChart = ({ title, data }: { title?: string; data: ChartPoint[] }) => (
  <Frame tag="AIPieChart" title={title}>
    <ResponsiveContainer>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 10 }}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </Frame>
);
