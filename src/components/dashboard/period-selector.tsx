"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "1",  label: "今月" },
  { value: "3",  label: "3ヶ月" },
  { value: "6",  label: "6ヶ月" },
  { value: "12", label: "1年" },
] as const;

export function PeriodSelector({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("months", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => select(o.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            current === o.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
