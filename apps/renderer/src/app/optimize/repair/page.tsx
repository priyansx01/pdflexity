import { Wrench } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
        <Wrench className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Feature Coming Soon</h1>
      <p className="mt-2 max-w-xs text-muted-foreground">
        We're currently perfecting this tool to give you the best PDF experience. Stay tuned!
      </p>
      <a
        href="/"
        className="mt-8 rounded-lg bg-white/5 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
      >
        Back to Dashboard
      </a>
    </div>
  );
}
