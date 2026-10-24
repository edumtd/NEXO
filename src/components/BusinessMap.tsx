// Punto de entrada para TypeScript. Metro resuelve la versión por plataforma:
// BusinessMap.native.tsx (Android/iOS) y BusinessMap.web.tsx (navegador).
// Este archivo nunca se empaqueta; solo da tipos a quienes importan "@/components/BusinessMap".
export { BusinessMap } from "@/components/BusinessMap.web";
export type { BusinessMapProps, MapMarker } from "@/components/BusinessMap.types";
