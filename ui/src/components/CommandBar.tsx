"use client";

import { useState } from "react";

interface Command {
  label: string;
  action: () => void;
}

export default function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);

  const commands: Command[] = [
    {
      label: "Open Terminal",
      action: () => (window.location.href = "/terminal"),
    },
    {
      label: "Open Dashboard",
      action: () => (window.location.href = "/dashboard"),
    },
    { label: "Open Chat", action: () => (window.location.href = "/chat") },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-700"
      >
        Command
      </button>
      {isOpen && (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white rounded-lg shadow-lg p-2">
          {commands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => {
                cmd.action();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
