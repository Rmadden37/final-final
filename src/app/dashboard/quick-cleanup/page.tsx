import QuickLeadCleanup from "@/components/performance-dashboard.tsx/quick-lead-cleanup";

export default function QuickCleanupPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Quick Lead Cleanup</h1>
        <p className="text-muted-foreground">
          Remove the Ron Mcdonald lead to fix Ryan Madden appearing in both sections
        </p>
      </div>
      
      <QuickLeadCleanup />
    </div>
  );
}
