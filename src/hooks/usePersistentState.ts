import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Estado de una pantalla (filtros, búsqueda, orden) que se recuerda entre sesiones en el dispositivo.
 * Solo para preferencias: nunca guardes aquí datos personales ni la ubicación.
 * Lo leído se valida contra `defaults`: claves desconocidas o de otro tipo se ignoran.
 */
export function usePersistentState<T extends Record<string, unknown>>(storageKey: string | null, defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const loadedKey = useRef<string | null>(null);
  const defaultsRef = useRef(defaults);

  // Lee lo guardado al cambiar de usuario o pantalla. Hasta entonces no se escribe nada.
  useEffect(() => {
    loadedKey.current = null;
    setState(defaultsRef.current);
    if (!storageKey) return;
    let active = true;
    (async () => {
      let saved: Partial<T> = {};
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) saved = sanitize(JSON.parse(raw), defaultsRef.current);
      } catch {
        // Almacenamiento no disponible o dato corrupto: se usan los valores por defecto.
      }
      if (!active) return;
      setState({ ...defaultsRef.current, ...saved });
      loadedKey.current = storageKey;
    })();
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || loadedKey.current !== storageKey) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => {});
  }, [storageKey, state]);

  const update = useCallback((patch: Partial<T>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(defaultsRef.current), []);

  return [state, update, reset] as const;
}

function sanitize<T extends Record<string, unknown>>(value: unknown, defaults: T): Partial<T> {
  if (!value || typeof value !== "object") return {};
  const out: Partial<T> = {};
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const v = (value as Record<string, unknown>)[key as string];
    const d = defaults[key];
    // null es válido donde el valor por defecto es null (filtro sin elegir) o un texto/número opcional.
    if (v === null && (d === null || typeof d === "string" || typeof d === "number")) out[key] = v as T[keyof T];
    else if (v !== undefined && (d === null ? typeof v === "string" || typeof v === "number" : typeof v === typeof d)) {
      out[key] = v as T[keyof T];
    }
  }
  return out;
}
