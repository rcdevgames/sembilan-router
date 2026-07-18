import { DashboardLayout } from "@/shared/components";
import UserUsagePageClient from "./page.client";

export default function UserUsagePage() {
  return (
    <DashboardLayout>
      <UserUsagePageClient />
    </DashboardLayout>
  );
}
