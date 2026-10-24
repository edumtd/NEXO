import { MapPin, Save } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { BusinessMap } from "@/components/BusinessMap";
import { Button } from "@/components/ui";
import { DEFAULT_CENTER, hasLocation, type GeoPoint } from "@/lib/geo";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { BusinessProfile } from "@/types";

/** El negocio coloca o mueve su pin tocando el mapa y lo guarda. Sin pin no aparece en el mapa de estudiantes. */
export function BusinessLocationPicker({ profile }: { profile: BusinessProfile }) {
  const { updateBusinessProfile } = useApp();
  const saved = hasLocation(profile) ? { latitude: profile.latitude, longitude: profile.longitude } : null;
  const [draft, setDraft] = useState<GeoPoint | null>(saved);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = !!draft && (draft.latitude !== saved?.latitude || draft.longitude !== saved?.longitude);

  return (
    <View className="gap-3">
      {!saved && (
        <View className="flex-row items-start gap-3 rounded-2xl bg-amber-50 p-3">
          <MapPin size={18} color={colors.amber} />
          <Text className="flex-1 text-sm leading-5 text-amber-700">
            Aún no colocas tu ubicación: no aparecerás en el mapa que ven los estudiantes.
          </Text>
        </View>
      )}
      <BusinessMap
        markers={
          draft ? [{ id: profile.id, title: profile.name, color: colors.coral, latitude: draft.latitude, longitude: draft.longitude }] : []
        }
        selectedId={profile.id}
        center={draft ?? DEFAULT_CENTER}
        onMapPress={(p) => {
          setDraft(p);
          setDone(false);
        }}
        height={280}
      />
      <Text className="text-xs text-ink-muted">Toca el mapa para colocar o mover tu pin.</Text>
      {error && <Text className="text-sm text-red-700">{error}</Text>}
      <Button
        title={done ? "Ubicación guardada ✓" : "Guardar ubicación"}
        icon={Save}
        variant="secondary"
        loading={saving}
        disabled={!changed && !done}
        onPress={async () => {
          if (!draft) return;
          setSaving(true);
          setError(null);
          const result = await updateBusinessProfile({ latitude: draft.latitude, longitude: draft.longitude });
          setSaving(false);
          if (result.error) setError(result.error);
          else setDone(true);
        }}
      />
    </View>
  );
}
