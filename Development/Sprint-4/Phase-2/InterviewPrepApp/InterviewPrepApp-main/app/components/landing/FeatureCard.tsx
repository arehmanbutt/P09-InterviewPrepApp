interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 backdrop-blur transition-all hover:border-border/60 hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-4 text-muted-foreground">{description}</p>
    </div>
  );
}
