import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NoAccess() {
  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        icon={<Lock />}
        title="You don't have access to this page"
        description="Ask the owner to update your staff permissions if you need it."
        action={
          <Button asChild variant="secondary">
            <Link href="/admin">Back to overview</Link>
          </Button>
        }
      />
    </Card>
  );
}
