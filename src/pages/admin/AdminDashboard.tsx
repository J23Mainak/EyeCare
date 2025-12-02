import React, { useState, useEffect } from "react";
import {
  Users,
  FileText,
  Bell,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
  BarChart3,
  Database,
  Trash2,
  X,
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
  Server,
  UserPlus,
  FileCheck,
  ScanEye,
  Layers
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { createPortal } from "react-dom";
import { apiService } from "../../lib/api";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [ragDocuments, setRagDocuments] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [userReminders, setUserReminders] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRAGModal, setShowRAGModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  
  // Confirm modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const COLORS = [
    "#60A5FA", // mid blue
    "#A78BFA", // mid violet
    "#F9A8D4", // mid pink
    "#FBBF24", // mid warm amber
    "#34D399", // mid pastel teal
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllData();
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, ragRes] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getAdminUsers(searchTerm),
        apiService.getRAGDocuments(),
      ]);

      setStats(statsRes);
      setUsers(usersRes.data || []);
      setRagDocuments(ragRes);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const [reportsRes, remindersRes] = await Promise.all([
        apiService.getUserReports(userId),
        apiService.getUserReminders(userId),
      ]);
      setUserReports(reportsRes.data || []);
      setUserReminders(remindersRes.data || []);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const openUserModal = async (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
    await fetchUserDetails(user._id);
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmTitle("Delete user");
    setConfirmMessage(
      "Are you sure you want to delete this user? This action cannot be undone."
    );
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        await apiService.deleteUser(userId);

        setNotification({
          type: "success",
          message: "User deleted successfully",
        });

        await fetchAllData();
        setShowUserModal(false);

        setTimeout(() => setNotification(null), 5000);
      } catch (error) {
        console.error("Error deleting user:", error);

        setNotification({
          type: "error",
          message: "Failed to delete user. Please try again.",
        });

        setTimeout(() => setNotification(null), 5000);
      } finally {
        setConfirmLoading(false);
        setConfirmVisible(false);
        setConfirmAction(null);
      }
    });
    setConfirmVisible(true);
  };

  const handleDeleteDocument = (docId: string) => {
    setConfirmTitle("Delete document");
    setConfirmMessage(
      "Are you sure you want to delete this document? This will remove it from the RAG system."
    );
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        await apiService.deleteRAGDocument(docId);

        setNotification({
          type: "success",
          message: "Document deleted successfully from RAG system",
        });

        await fetchAllData();

        setTimeout(() => setNotification(null), 5000);
      } catch (error) {
        console.error("Error deleting document:", error);

        setNotification({
          type: "error",
          message: "Failed to delete document. Please try again.",
        });

        setTimeout(() => setNotification(null), 5000);
      } finally {
        setConfirmLoading(false);
        setConfirmVisible(false);
        setConfirmAction(null);
      }
    });
    setConfirmVisible(true);
  };

  const closeConfirmModal = () => {
    setConfirmVisible(false);
    setConfirmAction(null);
    setConfirmLoading(false);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF9F6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-5 space-y-8 bg-[#FAF9F6] p-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[60] animate-slide-in">
          <div
            className={`rounded-2xl shadow-xl p-4 min-w-[320px] border-2 ${
              notification.type === "success"
                ? "bg-gradient-to-br from-teal-50 to-teal-100 border-teal-100"
                : "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-full ${
                  notification.type === "success" ? "bg-teal-500" : "bg-red-500"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle
                    className="w-5 h-5 text-white"
                    strokeWidth={2.5}
                  />
                ) : (
                  <AlertCircle
                    className="w-5 h-5 text-white"
                    strokeWidth={2.5}
                  />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-semibold text-sm ${
                    notification.type === "success"
                      ? "text-green-900"
                      : "text-red-900"
                  }`}
                >
                  {notification.type === "success" ? "Success!" : "Error"}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    notification.type === "success"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 px-1">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg flex items-center justify-center">
              <Server className="h-5 w-5 text-white relative -top-0.5" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold bg-black bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                Monitor and manage your retina care platform
              </p>
            </div>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center h-10 gap-2 px-6 py-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-2 border-blue-100 hover:border-blue-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 text-blue-600 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span className="font-semibold text-gray-700">
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 py-4">
          <div className="bg-gradient-to-br h-30 from-blue-500 to-blue-500 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-blue-100 text-sm">Total Users</p>
                <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-blue-100 text-sm">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>{stats?.activeUsers || 0} active</span>
              </div>
              <div className="flex items-center">
                <UserPlus className="w-4 h-4 mr-1" />
                <span>{stats?.newUsersThisMonth || 0} this month</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br h-30 from-indigo-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <ScanEye className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-indigo-100 text-sm">Total Scans</p>
                <p className="text-3xl font-bold">{stats?.totalReports || 0}</p>
              </div>
            </div>
            <div className="flex items-center text-indigo-100 text-sm">
              <Activity className="w-4 h-4 mr-1" />
              <span>Across all users</span>
            </div>
          </div>

          <div className="bg-gradient-to-br h-30 from-purple-400 to-purple-500 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Bell className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-purple-100 text-sm">Total Reminders</p>
                <p className="text-3xl font-bold">
                  {stats?.totalReminders || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center text-purple-100 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>{stats?.reminderStats?.sent || 0} sent successfully</span>
            </div>
          </div>

          <div
            className="bg-gradient-to-br h-30 from-teal-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
            onClick={() => setShowRAGModal(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <Database className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-teal-100 text-sm">RAG Documents</p>
                <p className="text-3xl font-bold">
                  {ragDocuments?.stats?.totalDocuments || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center text-teal-100 text-sm">
              <Layers className="w-4 h-4 mr-1" />
              <span>{ragDocuments?.stats?.totalChunks || 0} total chunks</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Daily Scan Activity (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.recentActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="scans"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stage Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              DR Stage Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.stageDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(stats?.stageDistribution || []).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Severity Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
              Severity Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.severityDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "2px solid #3b82f6",
                    borderRadius: "12px",
                    padding: "16px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white rounded-xl p-4 shadow-2xl border-2 border-blue-400">
                          <p className="font-bold text-lg text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                            {data.name}
                          </p>
                          <p className="text-sm text-gray-700 mb-3 font-semibold">
                            Total Count:{" "}
                            <span className="text-blue-600 text-lg">
                              {data.value}
                            </span>
                          </p>
                          {data.users && data.users.length > 0 ? (
                            <div>
                              <p className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                                <Users className="w-4 h-4 mr-1 text-blue-600" />
                                Affected Users ({data.users.length}):
                              </p>
                              <div className="bg-blue-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  {data.users.join(", ")}
                                </p>
                              </div>
                              {data.users.length > 15 && (
                                <p className="text-xs text-gray-500 italic mt-2 text-center">
                                  Scroll to see all users
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              No user data available
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#ADD8E6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Reminder Status */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-blue-600" />
              Reminder Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-800">Sent</p>
                    <p className="text-sm text-gray-600">
                      Successfully delivered
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {stats?.reminderStats?.sent || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-800">Pending</p>
                    <p className="text-sm text-gray-600">Awaiting delivery</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-yellow-600">
                  {stats?.reminderStats?.pending || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-800">Failed</p>
                    <p className="text-sm text-gray-600">Delivery failed</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">
                  {stats?.reminderStats?.failed || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              User Management ({users.length} users)
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                    Scans
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {user.scanCount || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openUserModal(user)}
                        className="flex items-center text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal &&
        selectedUser &&
        createPortal(
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedUser.name}</h3>
                  <p className="text-blue-100">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* User Info Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Member Since</p>
                    <p className="font-bold text-gray-900">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Role</p>
                    <p className="font-bold text-gray-900 capitalize">
                      {selectedUser.role}
                    </p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-xl border-2 border-teal-200">
                    <p className="text-sm text-gray-600 mb-1">Total Scans</p>
                    <p className="font-bold text-gray-900">
                      {userReports.length}
                    </p>
                  </div>
                </div>

                {/* Scan History */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Scan History ({userReports.length})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {userReports.length > 0 ? (
                      userReports.map((report: any) => (
                        <div
                          key={report._id}
                          className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              Stage {report.stage}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">
                              <strong>{report.stageLabel}</strong>
                            </span>
                            <span className="text-gray-700">
                              Confidence:{" "}
                              <strong>{report.confidence?.toFixed(1)}%</strong>
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No scans yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Reminders */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-600" />
                    Reminders ({userReminders.length})
                  </h4>
                  <div className="space-y-3 h-30 overflow-y-auto">
                    {userReminders.length > 0 ? (
                      userReminders.map((reminder: any) => (
                        <div
                          key={reminder._id}
                          className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                reminder.status === "sent"
                                  ? "bg-green-100 text-green-700"
                                  : reminder.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {reminder.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-600">
                              {reminder.notificationType}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            {reminder.title}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {reminder.note}
                          </p>
                          <p className="text-xs text-gray-600 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(reminder.dateTime).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No reminders set
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDeleteUser(selectedUser._id)}
                    className="flex items-center justify-center gap-2 h-11 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors flex-1"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete User
                  </button>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="flex items-center justify-center gap-2 h-11 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* RAG Documents Modal */}
      {showRAGModal &&
        ragDocuments &&
        createPortal(
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Header - Sticky */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-2xl font-bold">RAG Document Library</h3>
                  <p className="text-blue-100">
                    {ragDocuments.stats.totalDocuments} documents •{" "}
                    {ragDocuments.stats.totalChunks} chunks
                  </p>
                </div>
                <button
                  onClick={() => setShowRAGModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#f4f4f3]">
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Total Documents
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {ragDocuments.stats.totalDocuments}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-300">
                    <p className="text-sm text-gray-600 mb-1">Total Chunks</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {ragDocuments.stats.totalChunks}
                    </p>
                  </div>
                  <div className="bg-teal-100 p-4 rounded-xl border-2 border-teal-200">
                    <p className="text-sm text-gray-600 mb-1">Avg Chunks/Doc</p>
                    <p className="text-2xl font-bold text-green-600">
                      {ragDocuments.stats.avgChunksPerDoc}
                    </p>
                  </div>
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  {ragDocuments.documents.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors bg-white relative group"
                    >
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="absolute top-4 right-4 h-8 w-9 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-md transition-all border border-red-200"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>

                      <div className="flex items-start justify-between mb-2 pr-12">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {doc.title}
                          </h4>
                          <p className="text-sm text-gray-600 break-all">
                            {doc.source}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-2 h-8 rounded-md text-xs font-semibold flex-shrink-0 ${
                            doc.type === "pdf"
                              ? "bg-blue-100 text-blue-700 transition-all border border-blue-300"
                              : "bg-blue-100 text-blue-700 transition-all border border-blue-300"
                          }`}
                        >
                          {doc.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Database className="w-4 h-4 mr-1" />
                          {doc.chunks} chunks
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(doc.added_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                          ID: {doc._id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {ragDocuments.documents.length === 0 && (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No documents uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {confirmVisible &&
        createPortal(
          <div
            className="fixed top-0 left-0 w-screen h-screen bg-black/50 flex items-center justify-center p-4 z-[10000]"
            onClick={closeConfirmModal} // clicking outside closes
          >
            <div
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="py-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {confirmTitle}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{confirmMessage}</p>
                </div>

                <button
                  onClick={() => {
                    setConfirmVisible(false);
                    setConfirmAction(null);
                  }}
                  className="text-gray-400 hover:text-gray-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onMouseDown={(e) => {
                    // immediate close to avoid tiny browser delays
                    e.preventDefault();
                  }}
                  onClick={() => {
                    setConfirmVisible(false);
                    setConfirmAction(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    if (!confirmAction) return;
                    await confirmAction();
                  }}
                  disabled={confirmLoading}
                  className={`px-4 py-2 rounded-lg font-semibold text-white ${
                    confirmLoading
                      ? "bg-red-300"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {confirmLoading ? "Processing..." : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminDashboard;
