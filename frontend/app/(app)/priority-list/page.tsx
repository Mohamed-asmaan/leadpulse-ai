"use client";

import { PriorityList } from "@/components/leads/PriorityList";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PriorityListPage() {
  return (
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto space-y-6">
      <PageHeader
        label="Lead desk"
        title="Priority list"
        description="Lead ranking based on engagement signals, inactivity penalties, and explainable score reasons."
      />
      <PriorityList />
    </div>
  );
}
