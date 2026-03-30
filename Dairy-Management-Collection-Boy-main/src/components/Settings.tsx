import React, { useEffect, useRef } from "react";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fadeIn"
    >
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-700">
          Settings
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Dark Mode Toggle */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Dark Mode
          </span>
          <input type="checkbox" className="toggle" />
        </div>

        {/* Profile */}
        <button className="w-full text-left text-sm text-gray-600 hover:text-green-600">
          Edit Profile
        </button>

        {/* Change Password */}
        <button className="w-full text-left text-sm text-gray-600 hover:text-green-600">
          Change Password
        </button>

        {/* Logout */}
        <button className="w-full text-left text-sm text-red-500 hover:text-red-600">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Settings;