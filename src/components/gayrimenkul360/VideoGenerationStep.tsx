import { useState } from "react";
import { Video, Play, ArrowLeft, ArrowRight, Loader2, Film, Mic, Music } from "lucide-react";
import { Listing } from "@/hooks/useListings";

interface VideoGenerationStepProps {
  listing: Listing;
  onContinue: () => void;
  onBack: () => void;
}

interface VideoScene {
  title: string;
  description: string;
  duration: number;
}

interface VideoScript {
  narration: string;
  scenes: VideoScene[];
}

const VideoGenerationStep = ({ listing, onContinue, onBack }: VideoGenerationStepProps) => {
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-listing-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ listing }),
        }
      );
      const data = await resp.json();
      if (data.script) {
        setScript(data.script);
      }
    } catch (e) {
      console.error("Video generation error:", e);
    }
    setGenerating(false);
  };

  const totalDuration = script?.scenes.reduce((s, sc) => s + sc.duration, 0) || 0;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#F1F5F9" }}>Video Oluşturma</h3>

      {!script ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(16,185,129,0.12)" }}>
            {generating ? (
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#10B981" }} />
            ) : (
              <Video className="w-8 h-8" style={{ color: "#10B981" }} />
            )}
          </div>
          <p className="text-sm font-medium mb-2" style={{ color: "#F1F5F9" }}>
            {generating ? "Video senaryosu oluşturuluyor..." : "Tanıtım Videosu Oluştur"}
          </p>
          <p className="text-xs mb-6" style={{ color: "#64748B" }}>
            {listing.listing_type === "arsa"
              ? "AI, arsanız için drone tarzı bir tanıtım videosu senaryosu oluşturacak"
              : "AI, gayrimenkulünüz için sinematik bir tanıtım videosu senaryosu oluşturacak"}
          </p>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
              <Film className="w-3.5 h-3.5" /> Sinematik Sahneler
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
              <Mic className="w-3.5 h-3.5" /> Seslendirme
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
              <Music className="w-3.5 h-3.5" /> Arka Plan Müziği
            </div>
          </div>

          {!generating && (
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
              style={{ backgroundColor: "#10B981" }}
            >
              <Video className="w-4 h-4 inline mr-1.5" />
              Video Oluştur
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Video preview */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#000", border: "1px solid #1E2732" }}>
            <div className="relative aspect-video flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F1419 0%, #1a2332 100%)" }}>
              {previewPlaying ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  {activeSceneIndex !== null && activeSceneIndex < script.scenes.length && (
                    <div
                      key={`scene-${activeSceneIndex}-${previewKey}`}
                      className="absolute inset-0 flex flex-col items-center justify-center p-8"
                      style={{ animation: `fadeInOut ${script.scenes[activeSceneIndex].duration}s ease-in-out forwards` }}
                    >
                      <div className="absolute top-4 left-4 px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                        Sahne {activeSceneIndex + 1}/{script.scenes.length}
                      </div>
                      <p className="text-lg font-bold text-white mb-2">{script.scenes[activeSceneIndex].title}</p>
                      <p className="text-sm text-white/70 max-w-md">{script.scenes[activeSceneIndex].description}</p>
                    </div>
                  )}
                  {activeSceneIndex !== null && activeSceneIndex >= script.scenes.length && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-white/70 mb-3">Önizleme tamamlandı</p>
                      <button
                        onClick={() => { setPreviewPlaying(false); setActiveSceneIndex(null); setPreviewKey(k => k + 1); }}
                        className="px-4 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: "#10B981" }}
                      >
                        <Play className="w-3.5 h-3.5 inline mr-1" /> Tekrar İzle
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={startPreview}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: "rgba(16,185,129,0.9)" }}
                >
                  <Play className="w-7 h-7 text-white ml-1" />
                </button>
              )}

              {/* Duration badge */}
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>
                {totalDuration}s
              </div>
            </div>
          </div>

          {/* Narration */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4" style={{ color: "#10B981" }} />
              <p className="text-xs font-semibold" style={{ color: "#F1F5F9" }}>Seslendirme Metni</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{script.narration}</p>
          </div>

          {/* Scenes list */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "#F1F5F9" }}>Sahneler ({script.scenes.length})</p>
            <div className="space-y-2">
              {script.scenes.map((scene, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: activeSceneIndex === i ? "rgba(16,185,129,0.1)" : "#0F1419",
                    border: activeSceneIndex === i ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                  }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: "#F1F5F9" }}>{scene.title}</p>
                    <p className="text-[11px]" style={{ color: "#64748B" }}>{scene.description}</p>
                  </div>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: "#64748B" }}>{scene.duration}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onBack} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
          <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />Geri
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#10B981" }}
        >
          Devam Et <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
        </button>
      </div>
    </div>
  );
};

export default VideoGenerationStep;
