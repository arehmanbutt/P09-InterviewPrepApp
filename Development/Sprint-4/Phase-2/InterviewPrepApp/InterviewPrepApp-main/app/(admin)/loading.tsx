import { Skeleton } from "@/app/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-8 p-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
