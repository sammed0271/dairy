// src/pages/sell/AddSale.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addSale } from "../../../axios/saleApi";
import toast from "react-hot-toast";

const AddSale = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    type: "MILK",
    productName: "", // ✅ manual product name
    collectorName: "",
    quantity: "",
    rate: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ total
  const total =
    Number(form.quantity || 0) * Number(form.rate || 0);

  // ✅ validation
  const validate = () => {
    if (!form.quantity || !form.rate) {
      return "Quantity and Rate are required";
    }

    if (form.type === "PRODUCT" && !form.productName) {
      return "Enter product name";
    }

    return "";
  };

  // ✅ submit
  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addSale({
        type: form.type,
        productName: form.productName, // ✅ send name
        collectorName: form.collectorName,
        quantity: Number(form.quantity),
        rate: Number(form.rate),
        total,
      });

      toast.success("Sale Added Successfully");

      navigate("/sell");
    } catch (err) {
      console.error(err);
      setError("Failed to add sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl">
      <h2 className="text-xl font-semibold mb-4">Add Sale</h2>

      {error && (
        <div className="bg-red-100 text-red-600 p-2 mb-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <select
          className="border p-2 rounded"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value })
          }
        >
          <option value="MILK">Milk</option>
          <option value="PRODUCT">Product</option>
        </select>

        {/* Collector */}
        <input
          className="border p-2 rounded"
          placeholder="Collector Name (Gokul)"
          value={form.collectorName}
          onChange={(e) =>
            setForm({ ...form, collectorName: e.target.value })
          }
        />

        {/* Product Name (manual) */}
        {form.type === "PRODUCT" && (
          <input
            className="border p-2 rounded"
            placeholder="Enter Product Name (e.g. Ghee, Paneer)"
            value={form.productName}
            onChange={(e) =>
              setForm({ ...form, productName: e.target.value })
            }
          />
        )}

        {/* Quantity */}
        <input
          className="border p-2 rounded"
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) =>
            setForm({ ...form, quantity: e.target.value })
          }
        />

        {/* Rate */}
        <input
          className="border p-2 rounded"
          type="number"
          placeholder="Rate"
          value={form.rate}
          onChange={(e) =>
            setForm({ ...form, rate: e.target.value })
          }
        />
      </div>

      {/* Total */}
      <div className="mt-4 text-lg font-semibold">
        Total: ₹ {total.toLocaleString()}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Sale"}
      </button>
    </div>
  );
};

export default AddSale;