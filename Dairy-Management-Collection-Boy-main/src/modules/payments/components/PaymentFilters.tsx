import React from "react";
import { FormInput, SelectInput } from "../../shared/components";

interface PaymentFiltersProps {
  search: string;
  status: string;
  centreId: string;
  isSuperadmin: boolean;
  centres: Array<{ _id: string; name: string; code: string }>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCentreChange: (value: string) => void;
  onReset: () => void;
}

const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  search,
  status,
  centreId,
  isSuperadmin,
  centres,
  onSearchChange,
  onStatusChange,
  onCentreChange,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      <FormInput
        label="Search"
        placeholder="Farmer, code, payout id"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      <SelectInput
        label="Status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        options={[
          { label: "All statuses", value: "" },
          { label: "Initiated", value: "initiated" },
          { label: "Processing", value: "processing" },
          { label: "Processed", value: "processed" },
          { label: "Failed", value: "failed" },
          { label: "Reversed", value: "reversed" },
        ]}
      />

      {isSuperadmin && (
        <SelectInput
          label="Centre"
          value={centreId}
          onChange={(event) => onCentreChange(event.target.value)}
          options={[
            { label: "All centres", value: "" },
            ...centres.map((centre) => ({
              label: `${centre.name} (${centre.code})`,
              value: centre._id,
            })),
          ]}
        />
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-md border border-[#E9E2C8] px-4 py-2 text-sm font-medium text-[#5E503F] hover:bg-[#F8F4E3]"
      >
        Clear Filters
      </button>
    </div>
  );
};

export default PaymentFilters;
