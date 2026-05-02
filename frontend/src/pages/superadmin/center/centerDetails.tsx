import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCenterById, getDailyMilkTrend, getFatSnfStats, getCenterPerformance } from "../../../axios/center_api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Legend, Line, CartesianGrid, AreaChart, Area } from "recharts";
import { Users, Droplets, Banknote, Percent, ChevronRight } from 'lucide-react';

export default function CenterDetails() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  const [filters, setFilters] = useState({
    range: "7d",
    shift: "all",
    milkType: "all",
  });

  const [trendData, setTrendData] = useState<any[]>([]);
  const [fatSnfData, setFatSnfData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);


  const fetchCharts = async () => {
    const { from, to } = getDateRange();

    const params = {
      from,
      to,
      shift: filters.shift,
      milkType: filters.milkType,
    };

    const [cent, trend, fatSnf, perf] = await Promise.all([
      getCenterById(id!, params),
      getDailyMilkTrend(id!, params),
      getFatSnfStats(id!, params),
      getCenterPerformance(id!, params),
    ]);
    setData(cent.data);
    setTrendData(trend.data);
    setFatSnfData(fatSnf.data);
    setPerformanceData(perf.data);
  };

  useEffect(() => {
    fetchCharts();
  }, [filters]);




  const getDateRange = () => {
    const today = new Date();
    let from = new Date();
    console.log("Selected Range:", filters.range); // Debug log
    console.log("Today:", today.toISOString().slice(0, 10)); // Debug log

    if (filters.range === "7d") {
      from.setDate(today.getDate() - 7);
    } else if (filters.range === "30d") {
      from.setDate(today.getDate() - 30);
    }

    return {
      from: from.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    };
  };


  if (!data) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-gray-500 font-medium mt-1">Collection Center ID: {data.code}</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <select
            value={filters.range}
            onChange={(e) => setFilters({ ...filters, range: e.target.value })}
            className="px-3 py-2 text-sm font-semibold text-gray-600 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <div className="w-[1px] h-6 bg-gray-200 self-center" />

          <select
            value={filters.shift}
            onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
            className="px-3 py-2 text-sm font-semibold text-gray-600 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
          </select>

          <div className="w-[1px] h-6 bg-gray-200 self-center" />

          <select
            value={filters.milkType}
            onChange={(e) => setFilters({ ...filters, milkType: e.target.value })}
            className="px-3 py-2 text-sm font-semibold text-gray-600 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">All Milk Types</option>
            <option value="cow">Cow</option>
            <option value="buffalo">Buffalo</option>
            <option value="mix">Mix</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Stat
          title="Total Farmers"
          value={data.farmersCount}
          icon={<Users className="text-blue-600" size={20} />}
          trend="+2 this week"
        />
        <Stat
          title="Milk Collected"
          value={`${data.stats.totalLiters.toLocaleString()} L`}
          icon={<Droplets className="text-cyan-600" size={20} />}
          trend="Last 7 days"
        />
        <Stat
          title="Total Revenue"
          value={`₹${data.stats.totalAmount.toLocaleString()}`}
          icon={<Banknote className="text-emerald-600" size={20} />}
          trend="Avg ₹42.5/L"
        />
        <Stat
          title="Average FAT"
          value={`${data.stats.avgFat?.toFixed(2)}%`}
          icon={<Percent className="text-amber-600" size={20} />}
          trend="Standard Quality"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <MilkTrendChart data={trendData} />
        <FatSnfChart data={fatSnfData} />
      </div>

      {/* Farmers List Table - Styled after image_767ac1.png */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Associated Farmers</h2>
          <button className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Farmer Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Farmer Code</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Supply Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.farmers.map((f: any) => (
                <tr key={f._id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-semibold text-gray-900">{f.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{f.code}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 rounded-lg transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, icon, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {trend && <p className="text-xs text-gray-400 mt-2 font-medium">{trend}</p>}
      </div>
    </div>
  );
}

export function MilkTrendChart({ data }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px] flex flex-col">
      {/* Header layout inspired by Screenshot 2026-05-01 100949.png */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-gray-900 font-bold text-lg">Daily Milk Trend</h3>
        <span className="text-gray-500 text-sm">Volume over time (L)</span>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* Using AreaChart for a subtle gradient effect underneath the trend line */}
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Dotted horizontal lines matching the reference screenshot */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />

            <XAxis
              dataKey="_id"
              axisLine={true}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />

            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }}
            />

            <Area
              type="monotone"
              dataKey="totalLiters"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorLiters)"
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FatSnfChart({ data }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px] flex flex-col">
      {/* Header Section styled after Screenshot 2026-05-01 100949.png */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-gray-900 font-bold text-lg">FAT vs SNF Trends</h3>
        <span className="text-gray-500 text-sm italic">Average percentage (%)</span>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            {/* Dotted grid lines to match the reference image */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="_id"
              axisLine={true}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px', fontSize: '12px' }}
            />

            {/* Line for FAT - using the vibrant blue from the screenshot */}
            <Line
              type="monotone"
              dataKey="avgFat"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              name="Avg FAT"
            />

            {/* Line for SNF - using a contrasting emerald/teal */}
            <Line
              type="monotone"
              dataKey="avgSnf"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              name="Avg SNF"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CenterPerformanceChart({ data }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px] flex flex-col">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-gray-900 font-bold text-lg">Top performing centers</h3>
        <span className="text-gray-500 text-sm">By total milk (L)</span>
      </div>

      {/* Chart Container */}
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#00000050"
            />
            <XAxis
              dataKey="name"
              axisLine={true}
              tickLine={true}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={true}
              tickLine={false}
              tick={{ fill: '#000000', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar
              dataKey="totalLiters"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              barSize={120}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}