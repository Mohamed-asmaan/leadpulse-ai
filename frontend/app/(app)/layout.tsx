import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FlashProvider } from "@/components/layout/FlashContext";
import { AppQueryProvider } from "@/components/providers/AppQueryProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppQueryProvider>
      <FlashProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </FlashProvider>
    </AppQueryProvider>
  );
}
