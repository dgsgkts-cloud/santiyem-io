// DEPO — depo yetkileri (sunucudaki depot_permission() ile aynı anahtarlar).
//
// Butonları gizlemek güvenlik değildir; son karar her zaman sunucudadır. Bu
// hook yalnızca kullanıcıya yapamayacağı işlemi göstermemek için kullanılır.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { NO_PERMISSIONS, type DepotPermissions } from "@/lib/inventory/transferModel";

const KEYS: (keyof DepotPermissions)[] = [
  "create_transfer",
  "approve_transfer",
  "dispatch_transfer",
  "receive_transfer",
  "override_safety_stock",
];

const db = supabase as any;

export const useDepotPermissions = () => {
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ["depot_permissions", user?.id ?? null],
    queryFn: async (): Promise<DepotPermissions> => {
      const results = await Promise.all(
        KEYS.map(async (key) => {
          const { data, error } = await db.rpc("depot_permission", { _key: key });
          if (error) return [key, false] as const;
          return [key, data === true] as const;
        }),
      );
      return { ...NO_PERMISSIONS, ...Object.fromEntries(results) } as DepotPermissions;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    permissions: data ?? NO_PERMISSIONS,
    isLoading,
  };
};
