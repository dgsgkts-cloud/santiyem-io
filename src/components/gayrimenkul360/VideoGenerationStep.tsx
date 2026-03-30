import { useState, useEffect, useCallback, useRef } from "react";
import { Video, Play, ArrowLeft, ArrowRight, Loader2, Film, Mic, Pause, RotateCcw } from "lucide-react";
import { Listing } from "@/hooks/useListings";

interface VideoGenerationStepProps {
  listing: Listing;
  onContinue: () => void;
  onBack: () => void;
}

interface VideoScene {
  title: string;
  description: string;
  image_url: string | null;
  duration: number;
  image_source?: "mapbox_satellite" | "ai_fallback" | null;
}

interface VideoScript {
  narration: string;
  scenes: VideoScene[];
}

const KEN_BURNS_VARIANTS = [
  { from: "scale(1) translate(0,0)", to: "scale(1.15) translate(-2%,-1%)" },
  { from: "scale(1.1) translate(-1%,0)", to: "scale(1) translate(1%,1%)" },
  { from: "scale(1) translate(1%,1%)", to: "scale(1.12) translate(-1%,-2%)" },
  { from: "scale(1.08) translate(0,2%)", to: "scale(1) translate(0,-1%)" },
  { from: "scale(1) translate(-2%,0)", to: "scale(1.1) translate(1%,-1%)" },
];

const VideoGenerationStep = ({ listing, onContinue, onBack }: VideoGenerationStepProps) => {
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = script?.scenes.reduce((s, sc) => s + sc.duration, 0) || 0;

  const handleGenerate = async () => {
    setGenerating(true);
    setWarning(null);
    setGenerationStep("Parselin gerçek konumundan uydu görüntüleri hazırlanıyor...");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-listing-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ listing }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || "Video oluşturma hatası");
      }

      if (data.script) {
        setScript(data.script);
        setActiveScene(0);
        setProgress(0);
        setPlaying(false);
      }

      setWarning(data.warning || null);
      setGenerationStep("");
    } catch (e: any) {
      console.error("Video generation error:", e);
      setGenerationStep(`Hata: ${e.message || "Bilinmeyen hata"}`);
      setTimeout(() => setGenerationStep(""), 3000);
    }

    setGenerating(false);
  };

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  }, []);

  const startPlayback = useCallback(() => {
    if (!script) return;
    setPlaying(true);
    setActiveScene(0);
    setProgress(0);
  }, [script]);

  useEffect(() => {
    if (!playing || !script) return;
    if (activeScene >= script.scenes.length) {
      stopPlayback();
      return;
    }

    const currentDurationSec = script.scenes[activeScene]?.duration || 4;
    const sceneDuration = currentDurationSec * 1000;
    const startTime = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / sceneDuration, 1));
    }, 50);

    timerRef.current = setTimeout(() => {
      if (progressRef.current) clearInterval(progressRef.current);
      setActiveScene((prev) => prev + 1);
      setProgress(0);
    }, sceneDuration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [playing, activeScene, script, stopPlayback]);

  const currentScene = script?.scenes[activeScene];
  const hasImages = script?.scenes.some((s) => s.image_url);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#F1F5F9" }}>
        Video Oluşturma
      </h3>

      {!script ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(16,185,129,0.12)" }}>
            {generating ? (
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#10B981" }} />
            ) : (
              <Video className="w-10 h-10" style={{ color: "#10B981" }} />
            )}
          </div>
          <p className="text-base font-semibold mb-2" style={{ color: "#F1F5F9" }}>
            {generating ? generationStep : "Gerçek Konum Videosu Oluştur"}
          </p>
          <p className="text-xs mb-6 max-w-sm mx-auto" style={{ color: "#64748B" }}>
            {generating
              ? "İşaretlenen parsel konumundan gerçek uydu görüntüleri hazırlanıyor..."
              : "Öncelik: işaretlenen arsanın gerçek uydu görüntüleri (Mapbox). Gerekirse AI yedek içerik kullanılır."}
          </p>

          {generating && (
            <div className="w-48 h-1.5 rounded-full mx-auto mb-4 overflow-hidden" style={{ backgroundColor: "#1E2732" }}>
              <div className="h-full rounded-full animate-pulse" style={{ backgroundColor: "#10B981", width: "60%", transition: "width 1s" }} />
            </div>
          )}

          {!generating && (
            <button
              onClick={handleGenerate}
              className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#10B981" }}
            >
              <Film className="w-4 h-4 inline mr-2" />
              Video Oluştur
            </button>
          )}
        </div>
      ) : (
        <>
          {warning && (
            <div className="rounded-lg px-3 py-2 text-xs mb-3" style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#F59E0B" }}>
              {warning}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden max-w-sm mx-auto sm:max-w-none" style={{ border: "1px solid #1E2732" }}>
              <div className="relative overflow-hidden aspect-[9/16] sm:aspect-video" style={{ backgroundColor: "#000" }}>
                {hasImages && currentScene?.image_url ? (
                  <img
                    key={`img-${activeScene}`}
                    src={currentScene.image_url}
                    alt={currentScene.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      animation: playing ? `kenBurns${activeScene % KEN_BURNS_VARIANTS.length} ${currentScene.duration}s ease-in-out forwards` : undefined,
                      filter: playing ? "none" : "brightness(0.65)",
                    }}
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f38 100%)" }} />
                )}

                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 100%)" }} />

                {playing && currentScene && activeScene < script.scenes.length && (
                  <div key={`text-${activeScene}`} className="absolute inset-0 flex flex-col justify-end p-6" style={{ animation: "fadeSlideUp 0.8s ease-out forwards" }}>
                    <div className="px-2 py-0.5 rounded text-[10px] font-medium w-fit mb-2" style={{ backgroundColor: "rgba(16,185,129,0.3)", color: "#10B981" }}>
                      {activeScene + 1} / {script.scenes.length}
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white mb-1 drop-shadow-lg">{currentScene.title}</p>
                    <p className="text-xs sm:text-sm text-white/80 max-w-md drop-shadow">{currentScene.description}</p>
                  </div>
                )}

                {!playing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={startPlayback}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: "rgba(16,185,129,0.85)" }}
                    >
                      <Play className="w-7 h-7 text-white ml-1" />
                    </button>
                  </div>
                )}

                {playing && (
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button onClick={stopPlayback} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                      <Pause className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                )}

                {!playing && activeScene >= script.scenes.length && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <p className="text-sm font-medium text-white/80 mb-3">Önizleme Tamamlandı</p>
                    <button onClick={startPlayback} className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: "#10B981" }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Tekrar İzle
                    </button>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-1 flex" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                  {script.scenes.map((scene, i) => (
                    <div key={i} className="h-full relative" style={{ flex: scene.duration }}>
                      <div
                        className="h-full"
                        style={{
                          backgroundColor: "#10B981",
                          width: i < activeScene ? "100%" : i === activeScene ? `${progress * 100}%` : "0%",
                          transition: i === activeScene ? "none" : "width 0.3s",
                        }}
                      />
                      {i < script.scenes.length - 1 && (
                        <div className="absolute right-0 top-0 w-px h-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-3 right-3 px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>
                  {totalDuration}s
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4" style={{ color: "#10B981" }} />
                <p className="text-xs font-semibold" style={{ color: "#F1F5F9" }}>Seslendirme Metni</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{script.narration}</p>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onBack} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
          <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />Geri
        </button>
        <button
          onClick={onContinue}
          disabled={!script}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "#10B981" }}
        >
          Devam Et <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
        </button>
      </div>
    </div>
  );
};

export default VideoGenerationStep;
