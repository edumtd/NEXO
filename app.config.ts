import type { ConfigContext, ExpoConfig } from "expo/config";

// Extiende app.json con valores que vienen de variables de entorno (.env).
// Las claves NUNCA se escriben en el código: ver .env.example.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "NEXO",
  slug: config.slug ?? "nexo",
  plugins: [
    ...(config.plugins ?? []),
    // Android usa Google Maps (requiere clave en builds propios; en Expo Go no hace falta).
    // iOS usa Apple Maps, sin clave.
    ["react-native-maps", { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY }],
    [
      "expo-location",
      { locationWhenInUsePermission: "NEXO usa tu ubicación solo para mostrar negocios cercanos. No se guarda." },
    ],
  ],
});
