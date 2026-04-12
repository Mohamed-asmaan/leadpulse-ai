import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FlashProvider } from "@/components/layout/FlashContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FlashProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </FlashProvider>
  );
}
