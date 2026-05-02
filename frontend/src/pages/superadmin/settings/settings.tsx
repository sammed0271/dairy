import { useEffect, useState } from "react";
import { api } from "../../../axios/axiosInstance";
import { getCenters } from "../../../axios/center_api";
import { assignCentertoUser, getUsers } from "../../../axios/user_api";

import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [u, c] = await Promise.all([
      getUsers(),
      getCenters(),
    ]);
    setUsers(u.data);
    console.log("users : ", u.data);
    console.log("centers : ", c);
    setCenters(c.data);
  };

  const handleAssign = async (userId: string, centerId: string) => {
    // optimistic update



    try {
      const res = await assignCentertoUser(userId, centerId);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ?
            res.data.user

            : u
        )
      );
      console.log("inside assign :::", users);
      setEditingUserId(null);
      console.log("Assigned :: ", res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/users/${id}`);
    setUsers((prev) => prev.filter((u) => u._id !== id));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-xl font-bold mb-4">
          Settings & Access Control
        </h1>
        <button
          onClick={() => navigate("/sa/users/new")}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#3b82f6] text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
        >
          <span className="text-xl">+</span> Add Center
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="p-3">User</th>
              <th>Role</th>
              <th>Center</th>
              <th>Status</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr
                key={u._id}
                className="border-t hover:bg-gray-50 transition"
              >
                {/* USER */}
                <td className="p-3 flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-gray-500">
                      {u.email}
                    </p>
                  </div>
                </td>

                {/* ROLE */}
                <td>
                  <RoleBadge role={u.role} />
                </td>

                {/* CENTER */}
                <td>
                  {editingUserId === u._id ? (
                    <select
                      autoFocus
                      value={u.centerId || ""}
                      onChange={(e) =>
                        handleAssign(u._id, e.target.value)
                      }
                      onBlur={() => setEditingUserId(null)}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="">Assign Centers</option>
                      {centers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => {
                        if (u.role !== "superadmin") {
                          setEditingUserId(u._id);
                        }
                      }}
                      className={`cursor-pointer px-2 py-1 rounded ${u.role === "superadmin"
                        ? "text-gray-400 cursor-not-allowed"
                        : "hover:bg-gray-100"
                        }`}
                    >
                      {u.role !== "superadmin"
                        ? u.center?.name || "Not Assigned"
                        : "All Centers"}
                    </span>
                  )}{u.role !== "superadmin"
                    ? <span className="ml-1 text-xs text-gray-400">✏️</span>
                    : <span className="ml-1 text-xs text-gray-400"></span>}
                </td>

                {/* STATUS */}
                <td>
                  <span className="text-green-600 text-xs font-medium">
                    Active
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="text-right pr-4">
                  <button
                    onClick={() => handleDelete(u._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Avatar({ name }: any) {
  return (
    <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
      {name?.charAt(0)}
    </div>
  );
}

function RoleBadge({ role }: any) {
  const styles: any = {
    superadmin: "bg-purple-100 text-purple-600",
    admin: "bg-blue-100 text-blue-600",
    manager: "bg-green-100 text-green-600",
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-full ${styles[role] || "bg-gray-100"
        }`}
    >
      {role}
    </span>
  );
}