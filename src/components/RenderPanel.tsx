import { useState, useRef } from "react";
import { Upload, Image, Wand2, Download, X, FileText } from "lucide-react";
import { toast } from "sonner";

const RENDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render`;

const RenderPanel = () => {
  const [prompt, setPrompt] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ base64: string; name: string; type: string; preview?: string } | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Dosya boyutu 10MB'dan küçük olmalıdır.");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    const isDwg = file.name.toLowerCase().endsWith(".dwg") || file.name.toLowerCase().endsWith(".dxf");
    if (!allowedTypes.includes(file.type) && !isDwg) {
      toast.error("Desteklenen formatlar: PNG, JPG, WebP, PDF, DWG, DXF");
      return;
    }

    if (isDwg) {
      toast.info("DWG/DXF dosyası yüklendi. En iyi sonuç için CAD yazılımınızdan PDF veya görsel export almanız önerilir.", { duration: 5000 });
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const fileType = isDwg ? "dwg" : file.type.includes("pdf") ? "pdf" : "image";
      const preview = fileType === "image" ? (reader.result as string) : undefined;
      setUploadedFile({ base64, name: file.name, type: fileType, preview });
    };
    reader.readAsDataURL(file);
  };

  const handleRender = async () => {
    if (!prompt.trim()) {
      toast.error("Lütfen bir render açıklaması girin.");
      return;
    }

    setLoading(true);
    setResultImage(null);
    setResultText("");

    try {
      const resp = await fetch(RENDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_base64: uploadedFile?.base64 || null,
          file_type: uploadedFile?.type || null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Render oluşturulamadı");
        return;
      }

      if (data.image) {
        setResultImage(data.image);
      }
      if (data.text) {
        setResultText(data.text);
      }
      if (!data.image) {
        toast.error("Render görseli oluşturulamadı, lütfen farklı bir prompt deneyin.");
      }
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `render-${Date.now()}.png`;
    a.click();
  };

  const suggestions = [
    "Modern minimalist villa, akşam ışığı, havuz ve peyzaj",
    "Cam cepheli ofis binası, gündüz, kentsel çevre",
    "Geleneksel Türk evi, taş duvar, ahşap detaylar",
    "Sürdürülebilir yeşil bina, çatı bahçesi, güneş panelleri",
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">🎨 AI Mimari Render</h2>
        <p className="text-sm text-muted-foreground">
          Referans fotoğrafı veya proje dosyası yüklerseniz sistem artık kat sayısı, balkon yerleri ve cephe oranlarını koruyup sadece render kalitesini iyileştirir.
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Referans Dosya (Opsiyonel)</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
        >
          {uploadedFile ? (
            <div className="flex items-center justify-center gap-3">
              {uploadedFile.preview ? (
                <img src={uploadedFile.preview} alt="preview" className="w-20 h-20 object-cover rounded-lg" />
              ) : (
                <FileText className="w-10 h-10 text-primary" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">{uploadedFile.type === "pdf" ? "PDF Dosyası" : uploadedFile.type === "dwg" ? "DWG/DXF Dosyası" : "Görsel"}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                className="ml-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Fotoğraf, PDF, DWG veya DXF dosyası yükleyin</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP, PDF, DWG, DXF — Maks 10MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf,.dwg,.dxf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Prompt */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Render Açıklaması</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Örn: Modern villa, akşam ışığı, havuz, peyzaj düzenlemesi..."
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              {s.length > 40 ? s.slice(0, 40) + "…" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleRender}
        disabled={loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl chat-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Render oluşturuluyor...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Render Oluştur
          </>
        )}
      </button>

      {/* Result */}
      {resultImage && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Image className="w-4 h-4" /> Render Sonucu
            </h3>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> İndir
            </button>
          </div>
          <img
            src={resultImage}
            alt="AI Render"
            className="w-full rounded-xl border border-border shadow-sm"
          />
          {resultText && (
            <p className="text-sm text-muted-foreground">{resultText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RenderPanel;
