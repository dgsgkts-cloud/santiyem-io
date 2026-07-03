import { Component, type ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";

interface Props {
  onClose: () => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class VoiceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[VoiceCopilot crashed]", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error?.message || String(this.state.error);
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0E13]/95 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-[#1A0E0E] p-6 text-white">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <AlertCircle className="w-5 h-5" />
              Sesli asistan başlatılamadı
            </div>
            <button
              onClick={() => {
                this.setState({ error: null });
                this.props.onClose();
              }}
              className="text-white/60 hover:text-white"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-white/80 whitespace-pre-wrap break-words leading-relaxed">
            {msg}
          </div>
          <div className="text-xs text-white/40 mt-4">
            Bu hatayı bize iletirseniz, üzerinde daha net çalışabiliriz.
          </div>
        </div>
      </div>
    );
  }
}
