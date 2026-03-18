"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "削除",
  onConfirm,
  onCancel,
  destructive = true,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onCancel} />
      <div style={{ position: "relative", zIndex: 1 }} className="w-80 bg-white rounded-xl shadow-xl p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            className={`flex-1 ${destructive ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
