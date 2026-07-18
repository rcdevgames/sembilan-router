import { getMachineId } from "@/shared/utils/machine";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const machineId = await getMachineId();
  return <DashboardClient machineId={machineId} />;
}