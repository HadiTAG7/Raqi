import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { DateStatus } from "@/lib/dates";
import { labels } from "@/lib/labels";

const toneByStatus: Record<DateStatus, BadgeTone> = {
  active: "success",
  ending_soon: "warning",
  ended: "danger",
  unset: "neutral",
};

export function StatusBadge({ status }: { status: DateStatus }) {
  return <Badge tone={toneByStatus[status]}>{labels.status[status]}</Badge>;
}
