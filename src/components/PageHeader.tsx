import { cn } from "@/lib/utils";

interface Props {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, lede, actions, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3 mb-8", className)}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="block w-8 h-px bg-rule" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              {eyebrow}
            </span>
          </div>
          <h1 className="display text-display-l text-ink leading-[1.05]">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {lede && <p className="font-body text-body-l text-ink-2 max-w-2xl">{lede}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-rule rounded-[8px] bg-bg-elevated">
      <h3 className="display text-display-s text-ink">{title}</h3>
      {body && <p className="text-[14px] text-ink-3 mt-2 max-w-md">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
