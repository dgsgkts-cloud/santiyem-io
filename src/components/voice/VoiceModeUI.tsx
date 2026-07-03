import { Building2, HardHat, Car, X, Volume2, Sliders } from "lucide-react";
import type { VoiceMode, VoiceSettings, Sensitivity, VoiceSpeed } from "./voiceModes";

const MODE_META: Record<VoiceMode, { label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = {
  office:   { label: "Ofis",     icon: Building2, hint: "Sessiz ortam · doğal konuşma" },
  site:     { label: "Şantiye",  icon: HardHat,   hint: "Gürültü filtresi · Bas & konuş" },
  driving:  { label: "Sürüş",    icon: Car,       hint: "Eller serbest · 'Şantiyem' de" },
};

export function ModeSelector({ mode, onChange }: { mode: VoiceMode; onChange: (m: VoiceMode) => void }) {
  return (
    <div className="voice-glass-strong rounded-full p-1 flex items-center gap-1 voice-fade-in">
      {(Object.keys(MODE_META) as VoiceMode[]).map((m) => {
        const M = MODE_META[m];
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            aria-pressed={active}
            className={`relative h-9 px-3 md:px-4 rounded-full text-xs md:text-sm font-medium flex items-center gap-1.5 transition-all ${
              active ? "text-white" : "text-white/60 hover:text-white/90"
            }`}
            style={active ? {
              background: "linear-gradient(135deg, #FF6B2B, #C13A00)",
              boxShadow: "0 6px 18px -6px rgba(255,107,43,0.65)",
            } : undefined}
          >
            <M.icon className="w-4 h-4" />
            <span>{M.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ModeHint({ mode }: { mode: VoiceMode }) {
  const M = MODE_META[mode];
  return (
    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 flex items-center gap-2">
      <M.icon className="w-3 h-3" /> {M.hint}
    </div>
  );
}

/* =========================================================
   Settings sheet — right-side glass panel
   ========================================================= */
export function SettingsSheet({
  settings, onChange, onClose,
}: {
  settings: VoiceSettings;
  onChange: (patch: Partial<VoiceSettings>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end voice-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-full overflow-y-auto voice-glass-strong border-l border-white/10 p-5"
        style={{
          background: "linear-gradient(180deg, rgba(20,25,32,0.98), rgba(9,12,16,0.98))",
          paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#FF8F5A]" />
            <h2 className="text-base font-semibold text-white">Ses Ayarları</h2>
          </div>
          <button onClick={onClose} aria-label="Kapat"
            className="voice-glass-btn h-9 w-9 rounded-lg flex items-center justify-center text-white/70">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Section title="Ses hassasiyeti" hint="Mikrofonun konuşmayı ne kadar kolay algılayacağı">
          <Segmented<Sensitivity>
            value={settings.voiceSensitivity}
            onChange={(v) => onChange({ voiceSensitivity: v })}
            options={[
              { value: "low",    label: "Düşük" },
              { value: "medium", label: "Orta" },
              { value: "high",   label: "Yüksek" },
            ]}
          />
        </Section>

        <Section title="Kesme hassasiyeti" hint="AI konuşurken ne kadar kolay bölünsün">
          <Segmented<Sensitivity>
            value={settings.interruptionSensitivity}
            onChange={(v) => onChange({ interruptionSensitivity: v })}
            options={[
              { value: "low",    label: "Düşük" },
              { value: "medium", label: "Orta" },
              { value: "high",   label: "Yüksek" },
            ]}
          />
        </Section>

        <Section title="Bas & Konuş" hint="Sadece parmağını basılı tuttuğunda mikrofon açık">
          <Toggle checked={settings.pushToTalk} onChange={(v) => onChange({ pushToTalk: v })} />
        </Section>

        <Section title="Konuşma hızı" hint="AI cevaplarının okuma tempoisu">
          <Segmented<VoiceSpeed>
            value={settings.voiceSpeed}
            onChange={(v) => onChange({ voiceSpeed: v })}
            options={[
              { value: "slow",   label: "Yavaş" },
              { value: "normal", label: "Normal" },
              { value: "fast",   label: "Hızlı" },
            ]}
          />
        </Section>

        <Section title="Hoparlör sesi" hint={`${Math.round(settings.speakerVolume * 100)}%`}>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-white/50" />
            <input
              type="range" min={0} max={100} value={Math.round(settings.speakerVolume * 100)}
              onChange={(e) => onChange({ speakerVolume: Number(e.target.value) / 100 })}
              className="w-full accent-[#FF6B2B]"
            />
          </div>
        </Section>

        <Section title="Gürültü bastırma" hint="Şantiye, trafik ve makine seslerini filtreler">
          <Toggle checked={settings.noiseSuppression} onChange={(v) => onChange({ noiseSuppression: v })} />
        </Section>

        <Section title="Varsayılan: Şantiye Modu" hint="Uygulama açıldığında bu modda başlar">
          <Toggle checked={settings.siteModeDefault} onChange={(v) => onChange({ siteModeDefault: v })} />
        </Section>

        <p className="mt-4 text-[11px] text-white/35 leading-relaxed">
          Bazı gelişmiş ayarlar (VAD eşiği, konuşma sonu bekleme) ElevenLabs agent panelinden yönetilir.
          Buradaki ayarlar tarayıcı ses hattını ve arayüz davranışını değiştirir.
        </p>
      </aside>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 pb-5 border-b border-white/5 last:border-0">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm text-white/90 font-medium">{title}</div>
        {hint && <div className="text-[11px] text-white/40">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="voice-glass rounded-lg p-1 flex items-center gap-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex-1 h-9 rounded-md text-xs font-medium transition-all ${
              active ? "text-white" : "text-white/55 hover:text-white/85"
            }`}
            style={active ? { background: "linear-gradient(135deg, #FF6B2B, #C13A00)" } : undefined}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      className={`relative w-12 h-7 rounded-full transition-colors ${checked ? "bg-[#FF6B2B]" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`} />
    </button>
  );
}
