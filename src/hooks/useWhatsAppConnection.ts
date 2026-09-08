// WhatsApp hesap bağlantısı (QR / telefon kodu).
// Tüm oturum ve credential işleri sunucudadır; burada yalnızca durum ve
// geçici QR / pairing bilgisi tutulur.

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "qr_required"
  | "failed";

export interface WhatsAppConnection {
  id: string;
  status: WhatsAppConnectionStatus;
  mode: "qr" | "pairing";
  connected_number: string | null;
  display_name: string | null;
  connected_at: string | null;
  last_disconnected_at: string | null;
  last_health_check: string | null;
}

interface ConnectResult {
  ok: boolean;
  error?: string;
  connection: WhatsAppConnection | null;
  qr_base64?: string | null;
  pairing_code?: string | null;
}

const call = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("whatsapp-connection", { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const useWhatsAppConnection = (enabled = true) => {
  const qc = useQueryClient();
  const key = ["whatsapp-connection"];
  const [qr, setQr] = useState<{ image: string | null; code: string | null }>({ image: null, code: null });
  const pollRef = useRef<number | null>(null);

  const status = useQuery({
    queryKey: key,
    enabled,
    staleTime: 15_000,
    queryFn: () =>
      call<{ ok: boolean; available: boolean; connection: WhatsAppConnection | null }>({ action: "status" }),
  });

  const connection = status.data?.connection ?? null;
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["whatsapp-summary-status"] });
  }, [qc]);

  const connect = useMutation({
    mutationFn: (vars: { mode: "qr" | "pairing"; phone_number?: string }) =>
      call<ConnectResult>({ action: "connect", ...vars }),
    onSuccess: (res) => {
      setQr({ image: res.qr_base64 ?? null, code: res.pairing_code ?? null });
      invalidate();
    },
  });

  const disconnect = useMutation({
    mutationFn: () => call<{ ok: boolean }>({ action: "disconnect" }),
    onSuccess: () => {
      setQr({ image: null, code: null });
      invalidate();
    },
  });

  // QR/pairing beklerken bağlantı doğrulanana kadar sade yoklama.
  const awaitingConnection = !!qr.image || !!qr.code;
  useEffect(() => {
    if (!awaitingConnection || connection?.status === "connected") {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      if (connection?.status === "connected") setQr({ image: null, code: null });
      return;
    }
    pollRef.current = window.setInterval(() => {
      call<{ connection: WhatsAppConnection | null }>({ action: "health" })
        .then((res) => qc.setQueryData(key, (old: any) => ({ ...(old ?? {}), connection: res.connection })))
        .catch(() => {});
    }, 4000);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [awaitingConnection, connection?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    available: status.data?.available ?? false,
    connection,
    isLoading: status.isLoading,
    qr,
    clearQr: () => setQr({ image: null, code: null }),
    connect,
    disconnect,
    refresh: invalidate,
  };
};
