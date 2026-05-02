import { useEffect, useState } from "react";
import { getCenters, toggleCenter } from "../../../axios/center_api";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Power } from 'lucide-react';


export default function CenterPage() {
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const res = await getCenters();
      setCenters(res.data);
    } catch (err) {
      console.error("Failed to fetch centers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await toggleCenter(id);
      setCenters(prev =>
        prev.map(c =>
          c._id === id ? { ...c, isActive: !c.isActive } : c
        )
      );
    } catch (err) {
      console.error("Failed to fetch centers", err);
    }
  };
  const navigate = useNavigate(); // ✅ CORRECT

  const handleView = (id: string) => {
    navigate(`/sa/centers/${id}`); // ✅ just use it
  };

  if (!centers.length && !loading) {
    return <p>No centers found</p>;
  }


  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centers</h1>
          <p className="text-gray-500 mt-1">All dairy collection centers across the network.</p>
        </div>
        <button
          onClick={() => navigate("/sa/centers/new")}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#3b82f6] text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
        >
          <span className="text-xl">+</span> Add Center
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm mb-6 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name, code, owner..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 ">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Center</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>

              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Milk (L)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Fat</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Snf</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {centers.map((c: any) => (
              <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">Owner: {c.ownerName}</div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-600">{c.code}</td>
                {/* <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.isActive
                    ? "bg-green-50 text-green-500 border border-green-100"
                    : "bg-red-50 text-red-500 border border-red-100"
                    }`}>
                    {c.isActive ? "Active" : "Suspended"}
                  </span>
                </td> */}
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                  {c.totalLiters?.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                  {c.avgFat?.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                  {c.avgSnf?.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleToggle(c._id)}
                      className={`flex items-center  gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all ${c.isActive ? "bg-blue-500  hover:bg-blue-700" : "bg-red-400 hover:bg-red-600"
                        }`}
                    >
                      <Power className="w-4 h-4" />
                      {c.isActive ? "Active" : "Suspended"}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleView(c._id)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-10 text-center text-gray-500 font-medium">Loading centers...</div>
        )}
      </div>
    </div >
  );

}