import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Listing {
  id: string;
  user_id: string;
  listing_type: string;
  property_type: string | null;
  title: string;
  description: string;
  price: number;
  contact: string;
  rooms: string | null;
  sqm: number | null;
  floor_info: string | null;
  parcel_il: string | null;
  parcel_ilce: string | null;
  parcel_ada: string | null;
  parcel_parsel: string | null;
  parcel_area_sqm: number | null;
  parcel_coords: any;
  parcel_center_lat: number | null;
  parcel_center_lng: number | null;
  media_urls: string[];
  video_url: string | null;
  video_status: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useListings = () => {
  const { user } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("listings" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("İlanlar yüklenemedi");
    } else {
      setListings((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, [user]);

  const createListing = async (listing: Partial<Listing>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("listings" as any)
      .insert({ ...listing, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      toast.error("İlan oluşturulamadı");
      console.error(error);
      return null;
    }
    toast.success("İlan başarıyla oluşturuldu!");
    fetchListings();
    return data as any as Listing;
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    const { error } = await supabase
      .from("listings" as any)
      .update(updates as any)
      .eq("id", id);
    if (error) {
      toast.error("İlan güncellenemedi");
      return false;
    }
    toast.success("İlan güncellendi");
    fetchListings();
    return true;
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase
      .from("listings" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("İlan silinemedi");
      return false;
    }
    toast.success("İlan silindi");
    fetchListings();
    return true;
  };

  return { listings, loading, createListing, updateListing, deleteListing, refetch: fetchListings };
};
