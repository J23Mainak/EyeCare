// src/pages/user/UserDashboard.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ScanEye } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingDown,
  Calendar,
  MessageSquare,
  FileText,
  Eye,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000";

interface Report {
  _id: string;
  stage: number;
  stageLabel: string;
  createdAt: string;
}

interface Reminder {
  _id: string;
  title: string;
  note: string;
  dateTime: string;
  status: "pending" | "sent" | "failed";
  notificationType: "email" | "sms";
  contactInfo: string;
  createdAt: string;
}

export default function UserDashboard() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [reports, setReports] = useState<Report[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();

  // Robust token getter (prefers context token, falls back to localStorage)
  const getEffectiveToken = () => {
    if (token) return token;
    try {
      const stored = localStorage.getItem("token");
      if (stored) return stored;
    } catch (err) {
      console.error("Error reading token from localStorage", err);
    }
    return null;
  };

  // Re-run fetches when auth loading finishes OR token changes (sign-in / sign-out)
  useEffect(() => {
    if (!authLoading) {
      fetchReports();
      fetchReminders();
    }
    // explicitly depend on token so fetches re-run when token added/removed
  }, [authLoading, token]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const effectiveToken = getEffectiveToken();
      if (!effectiveToken) {
        console.warn("No auth token available, skipping reports fetch");
        setReports([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/reports`, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      });

      if (res.status === 401) {
        console.warn(
          "Unauthorized when fetching reports (token may be invalid/expired)"
        );
        setReports([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        console.error("Failed to fetch reports:", res.status, res.statusText);
        setReports([]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const fetchedReports: Report[] = data.reports || [];
      setReports(fetchedReports);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    setRemindersLoading(true);
    try {
      const effectiveToken = getEffectiveToken();
      if (!effectiveToken) {
        console.warn("No auth token available, skipping reminders fetch");
        setReminders([]);
        setRemindersLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/reminders`, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        console.warn(
          "Unauthorized when fetching reminders (token may be invalid/expired)"
        );
        setReminders([]);
        setRemindersLoading(false);
        return;
      }

      if (!res.ok) {
        console.error("Failed to fetch reminders:", res.status, res.statusText);
        setReminders([]);
        setRemindersLoading(false);
        return;
      }

      const data = await res.json();
      const fetchedReminders: Reminder[] = data.reminders || [];
      setReminders(fetchedReminders);
    } catch (err) {
      console.error("Failed to fetch reminders", err);
      setReminders([]);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Upcoming reminders count
  const getUpcomingRemindersCount = () => {
    const now = new Date();
    return reminders.filter(
      (reminder) =>
        reminder.status === "pending" && new Date(reminder.dateTime) > now
    ).length;
  };

  // Sort reports newest-first for deterministic behavior
  const reportsSortedByDateDesc = [...reports].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // Chart data: take newest 10, then reverse so chart shows oldest -> newest
  const chartData = reportsSortedByDateDesc
    .slice(0, 10)
    .reverse()
    .map((report) => {
      const date = report.createdAt ? new Date(report.createdAt) : new Date();
      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        severity: Number(report.stage ?? 0),
        label: report.stageLabel ?? "",
      };
    });

  // Last (most recent) report
  const getLastReport = () => {
    if (reportsSortedByDateDesc.length === 0) return null;
    return reportsSortedByDateDesc[0];
  };

  // Average severity (string with 1 decimal)
  const getAverageSeverity = () => {
    if (reports.length === 0) return "0.0";
    const sum = reports.reduce((acc, r) => acc + Number(r.stage ?? 0), 0);
    return (sum / reports.length).toFixed(1);
  };

  // Trend calculation (uses sorted descending)
  const getSeverityTrend = () => {
    if (reportsSortedByDateDesc.length < 2) return "stable";
    const recent = reportsSortedByDateDesc.slice(0, 3);
    const older = reportsSortedByDateDesc.slice(3, 6);

    if (older.length === 0) return "stable";

    const recentAvg =
      recent.reduce((acc, r) => acc + Number(r.stage ?? 0), 0) / recent.length;
    const olderAvg =
      older.reduce((acc, r) => acc + Number(r.stage ?? 0), 0) / older.length;

    if (recentAvg < olderAvg - 0.3) return "improving";
    if (recentAvg > olderAvg + 0.3) return "worsening";
    return "stable";
  };

  const lastReport = getLastReport();
  const trend = getSeverityTrend();
  const upcomingRemindersCount = getUpcomingRemindersCount();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading User Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 space-y-8 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div className="mb-4">
          <div className="flex items-center gap-3 px-1">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white relative -top-0.5" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold">Your Health Dashboard</h1>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <ScanEye className="h-5 w-5 text-amber-600" />
                Track your retina health and screening history
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 -mt-1">
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <a href="/reports">
              <Eye className="h-4 w-4 mr-2" />
              New Screening
            </a>
          </Button>
          <Button
            variant="secondary"
            asChild
            className="shadow-md hover:shadow-lg transition-all duration-200"
          >
            <a href="/reminders">
              <Calendar className="h-4 w-4 mr-2" />
              Set Reminder
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {reports.length}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Total Reports</h3>
          <p className="text-sm text-gray-600">
            {lastReport
              ? `Last: ${new Date(lastReport.createdAt).toLocaleDateString()}`
              : "No reports yet. Upload to get started."}
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-purple-500">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            {remindersLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                {upcomingRemindersCount}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Upcoming Reminders
          </h3>
          <p className="text-sm text-gray-600">
            {remindersLoading
              ? "Loading..."
              : upcomingRemindersCount > 0
              ? `${upcomingRemindersCount} pending reminder${
                  upcomingRemindersCount > 1 ? "s" : ""
                }`
              : "No reminders scheduled."}
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-green-500">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">24/7</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">AI Assistant</h3>
          <p className="text-sm text-gray-600">
            Chat with our assistant any time.
          </p>
        </Card>
      </div>

      {/* Progress Chart */}
      <Card className="p-6 shadow-lg border-t-4 border-t-blue-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              Severity Progress
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Lower values indicate better retina health
            </p>
          </div>

          {reports.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Average Severity</div>
              <div className="text-2xl font-bold text-gray-900">
                {getAverageSeverity()}
              </div>
              <div className="text-xs text-gray-500">
                Trend:{" "}
                <span
                  className={`font-semibold ${
                    trend === "improving"
                      ? "text-green-600"
                      : trend === "worsening"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {trend === "improving"
                    ? "↓ Improving"
                    : trend === "worsening"
                    ? "↑ Worsening"
                    : "→ Stable"}
                </span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              No Data Yet
            </h4>
            <p className="text-sm text-gray-600 max-w-md">
              Upload your first retina image in the Reports section to start
              tracking your progress
            </p>
            <Button asChild className="mt-4">
              <a href="/reports">Upload First Image</a>
            </Button>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#d1d5db" }}
                />
                <YAxis
                  domain={[0, 4]}
                  ticks={[0, 1, 2, 3, 4]}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#d1d5db" }}
                  label={{
                    value: "Severity Stage",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#6b7280", fontSize: 12 },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ color: "#111827", fontWeight: 600 }}
                  formatter={(value: any, name: any, props: any) => [
                    `Stage ${value} - ${props.payload.label}`,
                    "Severity",
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="circle"
                  formatter={() => "Retinopathy Stage"}
                />
                <defs>
                  <linearGradient
                    id="colorGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="severity"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Recent Report Summary */}
      {lastReport && (
        <Card className="p-6 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Most Recent Analysis
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Date</div>
              <div className="font-semibold text-gray-900">
                {new Date(lastReport.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Stage</div>
              <div className="font-semibold text-gray-900">
                Stage {lastReport.stage}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Classification</div>
              <div className="font-semibold text-gray-900">
                {lastReport.stageLabel}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
