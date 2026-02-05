import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  badge?: string;
}

export function PageHeader({ title, badge }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-semibold font-mono tracking-tight">
        {title}
      </h1>
      {badge && (
        <Badge variant="secondary">{badge}</Badge>
      )}
    </div>
  );
}
