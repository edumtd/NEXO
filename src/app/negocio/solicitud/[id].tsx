import { useLocalSearchParams } from "expo-router";

import { BusinessRequestDetail } from "@/components/ServiceRequestDetail";

export default function SolicitudNegocio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BusinessRequestDetail id={id} />;
}
