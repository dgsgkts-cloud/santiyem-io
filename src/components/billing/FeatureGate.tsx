import { ReactNode } from "react";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFeature } from "@/hooks/useFeature";
import { isNativeApp, NATIVE_SUB_NOTICE } from "@/lib/nativeGuards";

export interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  title?: string;
  description?: string;
  onUpgrade?: () => void;
}

export function FeatureGate({ feature, children, title, description, onUpgrade }: FeatureGateProps) {
  const { enabled, loading } = useFeature(feature);
  if (loading) return null;
  if (enabled) return <>{children}</>;
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium">{title ?? "Bu özellik planınıza dahil değil"}</div>
          <div className="text-sm text-muted-foreground">
            {description ?? "Daha üst bir planla bu özelliği açabilirsiniz."}
          </div>
        </div>
        {isNativeApp() ? (
          <span className="text-xs text-muted-foreground">{NATIVE_SUB_NOTICE}</span>
        ) : (
          <Button size="sm" onClick={onUpgrade}>
            <Zap className="h-3 w-3 mr-1" /> Planı yükselt
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
