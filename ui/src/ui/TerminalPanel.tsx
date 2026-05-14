"use client";
import TerminalEngine from "@/components/TerminalEngine";
import { useOS } from "@/state/os";

export function TerminalPanel() {
  const { terminalOutput } = useOS();

  return (
    <div className="w-full h-full">
      <TerminalEngine />
    </div>
  );
}
