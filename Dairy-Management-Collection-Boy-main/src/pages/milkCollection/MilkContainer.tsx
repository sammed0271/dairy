import React from "react";

interface MilkContainerProps {
  filledLiters: number; // how much filled in this container
  capacity?: number; // default 40
  color: string; // fill color
  label: string; // Cow / Buffalo
}

const MilkContainer: React.FC<MilkContainerProps> = ({
  filledLiters,
  capacity = 40,
  color,
  label,
}) => {
  const percentage = Math.min((filledLiters / capacity) * 100, 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-12 rounded-b-2xl rounded-t-md border border-gray-400 overflow-hidden bg-white shadow-sm">
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-500"
          style={{
            height: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="mt-1 text-[10px] font-medium text-[#5E503F] text-center">
        {label}
      </div>
      <div className="text-[9px] text-gray-500">
        {filledLiters.toFixed(1)}L / {capacity}L
      </div>
    </div>
  );
};

export default MilkContainer;
