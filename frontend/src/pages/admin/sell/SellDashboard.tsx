// src/pages/sell/SellDashboard.tsx

import { useEffect, useMemo, useState } from "react";
import { getSales } from "../../../axios/saleApi";
import { useNavigate } from "react-router-dom";

type Sale = {
  _id: string;
  type: "MILK" | "PRODUCT";
  collectorName?: string;
  productName?: string;
  quantity: number;
  total: number;
};

const SellDashboard = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getSales();

        if (isMounted) {
          setSales(res.data || []);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load sales");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Separate data
  const milkSales = useMemo(
    () => sales.filter((s) => s.type === "MILK"),
    [sales]
  );

  const productSales = useMemo(
    () => sales.filter((s) => s.type === "PRODUCT"),
    [sales]
  );

  // ✅ Calculations
  const totalRevenue = useMemo(
    () => sales.reduce((acc, s) => acc + (s.total || 0), 0),
    [sales]
  );

  const totalQty = useMemo(
    () => sales.reduce((acc, s) => acc + (s.quantity || 0), 0),
    [sales]
  );

  const productRevenue = useMemo(
    () => productSales.reduce((a, s) => a + s.total, 0),
    [productSales]
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Sell Dashboard</h1>

        <button
          onClick={() => navigate("/sell/add")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add Sale
        </button>
      </div>

      {/* 📊 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-500 text-white p-4 rounded shadow">
          <p className="text-sm">Total Revenue</p>
          <h2 className="text-xl font-bold">
            ₹ {totalRevenue.toLocaleString()}
          </h2>
        </div>

        <div className="bg-blue-500 text-white p-4 rounded shadow">
          <p className="text-sm">Total Sales</p>
          <h2 className="text-xl font-bold">{sales.length}</h2>
        </div>

        <div className="bg-orange-500 text-white p-4 rounded shadow">
          <p className="text-sm">Total Quantity</p>
          <h2 className="text-xl font-bold">{totalQty}</h2>
        </div>

        <div className="bg-purple-500 text-white p-4 rounded shadow">
          <p className="text-sm">Product Revenue</p>
          <h2 className="text-xl font-bold">
            ₹ {productRevenue.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* ❌ Error */}
      {error && (
        <div className="text-red-500 bg-red-100 p-3 rounded">
          {error}
        </div>
      )}

      {/* ⏳ Loading */}
      {loading ? (
        <div className="text-center py-10">Loading sales...</div>
      ) : sales.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No sales found
        </div>
      ) : (
        <>
          {/* 🥛 Milk Sales */}
          <h2 className="text-lg font-semibold mt-4">Milk Sales</h2>

          {milkSales.length === 0 ? (
            <div className="text-gray-500 py-2">No milk sales</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border mt-2 text-sm">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-2">Customer</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {milkSales.map((s) => (
                    <tr key={s._id} className="text-center border">
                      <td>{s.collectorName || "-"}</td>
                      <td>{s.quantity}</td>
                      <td>₹ {s.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 🧀 Product Sales */}
          <h2 className="text-lg font-semibold mt-6">
            Product Sales
          </h2>

          {productSales.length === 0 ? (
            <div className="text-gray-500 py-2">
              No product sales
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border mt-2 text-sm">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="p-2">Product</th>
                    <th>Customer</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {productSales.map((s) => (
                    <tr key={s._id} className="text-center border">
                      <td>{s.productName || "Product"}</td>
                      <td>{s.collectorName || "-"}</td>
                      <td>{s.quantity}</td>
                      <td>₹ {s.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellDashboard;