// src/components/loader.tsx
import React from "react";

export type LoaderSize = "sm" | "md" | "lg";

export interface LoaderProps {
  size?: LoaderSize;
  fullScreen?: boolean;
  message?: string;
}

/**
 * App-wide loader spinner.
 */
const Loader: React.FC<LoaderProps> = ({
  size = "md",
  fullScreen = false,
  message,
}) => {
  const sizeClasses =
    size === "sm"
      ? "h-5 w-5 border-2"
      : size === "lg"
        ? "h-10 w-10 border-4"
        : "h-7 w-7 border-2";

  const spinner = (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`animate-spin rounded-full border-t-transparent border-[#2A9D8F] ${sizeClasses}`}
      />
      {message && <p className="text-xs text-[#5E503F]/70">{message}</p>}
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="rounded-lg bg-white px-6 py-4 shadow-lg border border-[#E9E2C8]">
        {spinner}
      </div>
    </div>
  );
};

export default Loader;
