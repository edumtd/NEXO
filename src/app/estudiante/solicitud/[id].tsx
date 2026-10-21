import { useLocalSearchParams } from "expo-router";

import { StudentRequestDetail } from "@/components/ServiceRequestDetail";

export default function SolicitudEstudiante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StudentRequestDetail id={id} />;
}
