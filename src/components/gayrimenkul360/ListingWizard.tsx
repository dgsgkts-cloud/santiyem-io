import { useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, FileText, Building2, Video, Eye } from "lucide-react";
import ParcelSelectionStep from "./ParcelSelectionStep";
import ParcelDetailStep from "./ParcelDetailStep";
import ListingTypeStep from "./ListingTypeStep";
import LandListingForm from "./LandListingForm";
import PropertyListingForm from "./PropertyListingForm";
import VideoGenerationStep from "./VideoGenerationStep";
import ListingPreview from "./ListingPreview";
import { useListings, Listing } from "@/hooks/useListings";

export interface ParcelData {
  lat: number;
  lng: number;
  il: string;
  ilce: string;
  ada: string;
  parsel: string;
  area: number;
  coords: [number, number][] | null;
}

export interface ListingFormData {
  listing_type: "arsa" | "gayrimenkul";
  property_type?: string;
  title: string;
  description: string;
  price: number;
  contact: string;
  rooms?: string;
  sqm?: number;
  floor_info?: string;
  media_urls: string[];
}

const STEPS = [
  { id: 1, label: "Parsel Seçimi", icon: MapPin },
  { id: 2, label: "Parsel Detay", icon: FileText },
  { id: 3, label: "İlan Türü", icon: Building2 },
  { id: 4, label: "İlan Bilgileri", icon: FileText },
  { id: 5, label: "Video Oluştur", icon: Video },
  { id: 6, label: "Önizleme", icon: Eye },
];

interface ListingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const ListingWizard = ({ onComplete, onCancel }: ListingWizardProps) => {
  const [step, setStep] = useState(1);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [listingType, setListingType] = useState<"arsa" | "gayrimenkul" | null>(null);
  const [formData, setFormData] = useState<ListingFormData | null>(null);
  const [createdListing, setCreatedListing] = useState<Listing | null>(null);
  const { createListing } = useListings();

  const handleParcelSelected = (data: ParcelData) => {
    setParcelData(data);
    setStep(2);
  };

  const handleListingTypeSelected = (type: "arsa" | "gayrimenkul") => {
    setListingType(type);
    setStep(4);
  };

  const handleFormSubmit = async (data: ListingFormData) => {
    setFormData(data);
    const listing = await createListing({
      listing_type: data.listing_type,
      property_type: data.property_type || null,
      title: data.title,
      description: data.description,
      price: data.price,
      contact: data.contact,
      rooms: data.rooms || null,
      sqm: data.sqm || null,
      floor_info: data.floor_info || null,
      parcel_il: parcelData?.il || null,
      parcel_ilce: parcelData?.ilce || null,
      parcel_ada: parcelData?.ada || null,
      parcel_parsel: parcelData?.parsel || null,
      parcel_area_sqm: parcelData?.area || null,
      parcel_coords: parcelData?.coords || null,
      parcel_center_lat: parcelData?.lat || null,
      parcel_center_lng: parcelData?.lng || null,
      media_urls: data.media_urls as any,
      status: "taslak",
    });
    if (listing) {
      setCreatedListing(listing);
      setStep(5);
    }
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive ? "rgba(16,185,129,0.15)" : isDone ? "rgba(16,185,129,0.08)" : "transparent",
                  color: isActive ? "#10B981" : isDone ? "#059669" : "#475569",
                  border: `1px solid ${isActive ? "rgba(16,185,129,0.3)" : "transparent"}`,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px mx-1" style={{ backgroundColor: isDone ? "#10B981" : "#1E2732" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="mb-4 flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "#64748B" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        İptal
      </button>

      {/* Step content */}
      {step === 1 && <ParcelSelectionStep onParcelSelected={handleParcelSelected} />}
      {step === 2 && parcelData && (
        <ParcelDetailStep parcel={parcelData} onContinue={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && <ListingTypeStep onSelect={handleListingTypeSelected} onBack={() => setStep(2)} />}
      {step === 4 && listingType === "arsa" && (
        <LandListingForm parcel={parcelData!} onSubmit={handleFormSubmit} onBack={() => setStep(3)} />
      )}
      {step === 4 && listingType === "gayrimenkul" && (
        <PropertyListingForm parcel={parcelData!} onSubmit={handleFormSubmit} onBack={() => setStep(3)} />
      )}
      {step === 5 && createdListing && (
        <VideoGenerationStep listing={createdListing} onContinue={() => setStep(6)} onBack={() => setStep(4)} />
      )}
      {step === 6 && createdListing && (
        <ListingPreview listing={createdListing} onFinish={onComplete} />
      )}
    </div>
  );
};

export default ListingWizard;
