import { useState, useEffect, useRef } from "react";
import { MapPin, Edit3, Upload, Search } from "lucide-react";
import { ParcelData } from "./ListingWizard";
import { supabase } from "@/integrations/supabase/client";

type SelectionMode = "map" | "manual" | "kml";

interface ParcelSelectionStepProps {
  onParcelSelected: (data: ParcelData) => void;
}

const ParcelSelectionStep = ({ onParcelSelected }: ParcelSelectionStepProps) => {
  const [mode, setMode] = useState<SelectionMode>("map");
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Manual form state
  const [manualIl, setManualIl] = useState("");
  const [manualIlce, setManualIlce] = useState("");
  const [manualAda, setManualAda] = useState("");
  const [manualParsel, setManualParsel] = useState("");
  const [manualArea, setManualArea] = useState("");

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-token`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const data = await resp.json();
        if (data.token) setMapToken(data.token);
      } catch (e) {
        console.error("Failed to fetch mapbox token:", e);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mode !== "map" || !mapToken || !mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.accessToken = mapToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [35.2433, 38.9637], // Turkey center
        zoom: 6,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("click", (e: any) => {
        const { lng, lat } = e.lngLat;
        setSelectedPoint({ lat, lng });

        if (markerRef.current) markerRef.current.remove();
        const marker = new mapboxgl.Marker({ color: "#10B981" })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current = marker;

        map.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
      });

      mapRef.current = map;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mode, mapToken]);

  const handleMapSelect = () => {
    if (!selectedPoint) return;
    onParcelSelected({
      lat: selectedPoint.lat,
      lng: selectedPoint.lng,
      il: "",
      ilce: "",
      ada: "",
      parsel: "",
      area: 0,
      coords: null,
    });
  };

  const handleManualSelect = () => {
    if (!manualIl || !manualAda || !manualParsel) return;
    onParcelSelected({
      lat: 0,
      lng: 0,
      il: manualIl,
      ilce: manualIlce,
      ada: manualAda,
      parsel: manualParsel,
      area: parseFloat(manualArea) || 0,
      coords: null,
    });
  };

  const handleKmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        // Parse KML for coordinates (basic parsing)
        const coordMatch = text.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        let coords: [number, number][] = [];
        if (coordMatch) {
          coords = coordMatch[1]
            .trim()
            .split(/\s+/)
            .map((c) => {
              const [lng, lat] = c.split(",").map(Number);
              return [lng, lat] as [number, number];
            })
            .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));
        }

        const center = coords.length > 0
          ? {
              lat: coords.reduce((s, c) => s + c[1], 0) / coords.length,
              lng: coords.reduce((s, c) => s + c[0], 0) / coords.length,
            }
          : { lat: 0, lng: 0 };

        onParcelSelected({
          lat: center.lat,
          lng: center.lng,
          il: "",
          ilce: "",
          ada: "",
          parsel: "",
          area: 0,
          coords: coords.length > 0 ? coords : null,
        });
      } catch {
        console.error("KML parse error");
      }
    };
    reader.readAsText(file);
  };

  const modes = [
    { id: "map" as SelectionMode, label: "Haritada Seç", icon: MapPin, desc: "Uydu haritasında tıklayarak seçin" },
    { id: "manual" as SelectionMode, label: "Bilgi Gir", icon: Edit3, desc: "İl, ilçe, ada ve parsel numarası girin" },
    { id: "kml" as SelectionMode, label: "KML Yükle", icon: Upload, desc: "KML/KMZ dosyası yükleyin" },
  ];

  return (
    <div>
      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all text-center"
              style={{
                backgroundColor: isActive ? "rgba(16,185,129,0.12)" : "#161C23",
                border: `1px solid ${isActive ? "rgba(16,185,129,0.3)" : "#1E2732"}`,
              }}
            >
              <Icon className="w-5 h-5" style={{ color: isActive ? "#10B981" : "#64748B" }} />
              <span className="text-xs font-medium" style={{ color: isActive ? "#10B981" : "#94A3B8" }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Map mode */}
      {mode === "map" && (
        <div>
          <div
            ref={mapContainerRef}
            className="w-full rounded-xl overflow-hidden mb-4"
            style={{ height: "400px", border: "1px solid #1E2732" }}
          />
          {!mapToken && (
            <div className="flex items-center justify-center h-[400px] rounded-xl mb-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <p className="text-sm" style={{ color: "#64748B" }}>Harita yükleniyor...</p>
            </div>
          )}
          {selectedPoint && (
            <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div>
                <p className="text-xs font-medium" style={{ color: "#10B981" }}>Seçilen Konum</p>
                <p className="text-xs" style={{ color: "#94A3B8" }}>
                  {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
                </p>
              </div>
              <button
                onClick={handleMapSelect}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ backgroundColor: "#10B981" }}
              >
                Devam Et →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>İl</label>
              <input
                value={manualIl}
                onChange={(e) => setManualIl(e.target.value)}
                placeholder="Örn: İstanbul"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>İlçe</label>
              <input
                value={manualIlce}
                onChange={(e) => setManualIlce(e.target.value)}
                placeholder="Örn: Kadıköy"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>Ada No</label>
              <input
                value={manualAda}
                onChange={(e) => setManualAda(e.target.value)}
                placeholder="Örn: 1234"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>Parsel No</label>
              <input
                value={manualParsel}
                onChange={(e) => setManualParsel(e.target.value)}
                placeholder="Örn: 56"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>Alan (m²)</label>
            <input
              value={manualArea}
              onChange={(e) => setManualArea(e.target.value)}
              placeholder="Örn: 500"
              type="number"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
            />
          </div>
          <button
            onClick={handleManualSelect}
            disabled={!manualIl || !manualAda || !manualParsel}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: "#10B981" }}
          >
            Devam Et →
          </button>
        </div>
      )}

      {/* KML mode */}
      {mode === "kml" && (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "2px dashed #1E2732" }}>
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "#64748B" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "#F1F5F9" }}>KML / KMZ Dosyası Yükleyin</p>
          <p className="text-xs mb-4" style={{ color: "#64748B" }}>Parsel geometrinizi dosya olarak yükleyin</p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all text-white" style={{ backgroundColor: "#10B981" }}>
            <Upload className="w-4 h-4" />
            Dosya Seç
            <input type="file" accept=".kml,.kmz" className="hidden" onChange={handleKmlUpload} />
          </label>
        </div>
      )}
    </div>
  );
};

export default ParcelSelectionStep;
