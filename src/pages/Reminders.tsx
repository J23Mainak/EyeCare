import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Send,
  Mail,
  Trash2,
  Calendar,
  Clock,
  Timer,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000";

interface Reminder {
  _id: string;
  title: string;
  note: string;
  dateTime: string;
  notificationType: "email" | "sms";
  contactInfo: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
}

interface ToastNotification {
  id: string;
  type: "success" | "error";
  title: string;
  message: string;
}

function ToastNotification({
  notification,
  onClose,
}: {
  notification: ToastNotification;
  onClose: () => void;
}) {
  const isError = notification.type === "error";
  const bgColor = isError
    ? "from-red-50 via-red-50 to-red-100"
    : "from-green-50 to-green-100";
  const iconBgColor = isError
    ? "bg-gradient-to-br from-red-500 to-red-600"
    : "bg-gradient-to-br from-green-500 to-green-600";
  const buttonColor = isError
    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div
        className={`bg-gradient-to-b ${bgColor} rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in`}
      >
        <div className="flex justify-center mb-6">
          <div className={`rounded-full p-4 ${iconBgColor} shadow-lg`}>
            {isError ? (
              <XCircle className="h-12 w-12 text-white" strokeWidth={1.5} />
            ) : (
              <CheckCircle className="h-12 w-12 text-white" strokeWidth={2.5} />
            )}
          </div>
        </div>
        <h3 className="text-center text-2xl font-bold text-gray-800 mb-4">
          {notification.title}
        </h3>
        <p className="text-center text-sm text-gray-600 leading-relaxed mb-6">
          {notification.message}
        </p>
        <button
          onClick={onClose}
          className={`w-full ${buttonColor} text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 shadow-md hover:shadow-lg`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ReminderCard({
  reminder,
  onDelete,
}: {
  reminder: Reminder;
  onDelete: (id: string) => void;
}) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    sent: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  };

  const statusIcons = {
    pending: <Clock className="h-3 w-3" />,
    sent: <CheckCircle className="h-3 w-3" />,
    failed: <AlertCircle className="h-3 w-3" />,
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            {reminder.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">{reminder.note}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(reminder._id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <div className="flex items-center gap-1.5 text-xs bg-purple-50 px-3 py-1.5 rounded-full">
          <Calendar className="h-3 w-3 text-purple-600" />
          <span className="text-purple-700 font-medium">
            {formatDateTime(reminder.dateTime)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs bg-blue-50 px-3 py-1.5 rounded-full">
          <Mail className="h-3 w-3 text-blue-600" />
          <span className="text-blue-700 font-medium">
            {reminder.contactInfo}
          </span>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
            statusColors[reminder.status]
          }`}
        >
          {statusIcons[reminder.status]}
          <span className="font-medium capitalize">{reminder.status}</span>
        </div>
      </div>
    </Card>
  );
}

export default function Reminders() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<ToastNotification | null>(
    null
  );
  const { token, user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (token) {
      fetchReminders();
    } else {
      // If no token, stop loading immediately
      setLoading(false);
    }
  }, [token]);

  // Track current user and reset form on user change
  useEffect(() => {
    if (!user?._id) return;

    const currentUserId = localStorage.getItem("currentUserId");
    const lastUserId = localStorage.getItem("lastReminderUserId");

    if (currentUserId !== user._id || lastUserId !== user._id) {
      console.log("User changed - clearing reminder form and data", {
        lastUserId,
        currentUserId: user._id,
      });

      // Clear form
      setTitle("");
      setNote("");
      setDateTime("");

      // Clear all user-specific reminder form data
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith("reminderFormData_")) {
          localStorage.removeItem(key);
        }
      });

      // Update tracking
      localStorage.setItem("lastReminderUserId", user._id);
      localStorage.setItem("currentUserId", user._id);
    }
  }, [user?._id]);

  // Persist form state to localStorage (user-specific)
  useEffect(() => {
    if (!user?._id) return;

    const userFormKey = `reminderFormData_${user._id}`;
    const savedForm = localStorage.getItem(userFormKey);

    if (savedForm) {
      const {
        title: savedTitle,
        note: savedNote,
        dateTime: savedDateTime,
      } = JSON.parse(savedForm);
      setTitle(savedTitle || "");
      setNote(savedNote || "");
      setDateTime(savedDateTime || "");
    }
  }, [user?._id]);

  // Save form data whenever it changes (user-specific)
  useEffect(() => {
    if (!user?._id) return;

    const userFormKey = `reminderFormData_${user._id}`;
    const formData = { title, note, dateTime };
    localStorage.setItem(userFormKey, JSON.stringify(formData));
  }, [title, note, dateTime, user?._id]);

  const showNotification = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    setNotification({ id: Date.now().toString(), type, title, message });
    setTimeout(() => setNotification(null), 10000);
  };

  const fetchReminders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/reminders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        showNotification(
          "error",
          "Authentication Error",
          "Please log in again to view your reminders."
        );
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
    } catch (err) {
      console.error("Failed to fetch reminders", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      showNotification(
        "error",
        "Authentication Required",
        "Please log in to create reminders."
      );
      return;
    }

    if (!title.trim() || !note.trim() || !dateTime) {
      showNotification(
        "error",
        "Missing Information",
        "Please fill in all fields to create a reminder."
      );
      return;
    }

    if (!user?.email) {
      showNotification(
        "error",
        "Email Not Found",
        "Your account email is not available. Please update your profile."
      );
      return;
    }

    const selectedDate = new Date(dateTime);
    if (isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
      showNotification(
        "error",
        "Invalid Date",
        "Please select a valid future date and time for your reminder."
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim(),
          dateTime,
          notificationType: "email",
          contactInfo: user.email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        showNotification(
          "error",
          "Authentication Error",
          "Your session has expired. Please log in again."
        );
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create reminder");
      }

      showNotification(
        "success",
        "Reminder Created!",
        `Your reminder has been set for ${new Date(
          dateTime
        ).toLocaleString()}. You'll receive a notification at ${user.email}.`
      );

      setTitle("");
      setNote("");
      setDateTime("");
      await fetchReminders();
    } catch (err: any) {
      console.error("❌ Failed to create reminder:", err);
      showNotification(
        "error",
        "Failed to Create Reminder",
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) {
      showNotification(
        "error",
        "Authentication Required",
        "Please log in to delete reminders."
      );
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/reminders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        showNotification(
          "error",
          "Authentication Error",
          "Your session has expired. Please log in again."
        );
        return;
      }

      if (res.ok) {
        showNotification(
          "success",
          "Reminder Deleted",
          "Your reminder has been removed successfully."
        );
        await fetchReminders();
      }
    } catch (err) {
      showNotification(
        "error",
        "Failed to Delete",
        "Could not delete the reminder. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-5">
      <div className="container mx-auto px-4 max-w-7xl">
        {notification && (
          <ToastNotification
            notification={notification}
            onClose={() => setNotification(null)}
          />
        )}

        <div className="mb-8">
          <div className="flex items-center gap-3 px-5">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold">Health Reminders</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Never miss your medication or appointments
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <Card className="p-8 w-full max-w-2xl shadow-xl border-t-4 border-t-purple-500 bg-gradient-to-br from-white to-purple-50/30">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Create New Reminder
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Reminder Title
                </Label>
                <Input
                  placeholder="e.g., Metformin 500mg, Eye Check-up"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 rounded-xl h-12 px-4 text-base
                  focus:outline-none focus-visible:outline-none
                  focus:ring-0 focus-visible:ring-0 focus:shadow-none
                  focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Personal Note
                </Label>
                <Textarea
                  placeholder="Add details about your medication, dosage, or appointment..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="border-2 rounded-xl p-4 text-base resize-none
                  focus:outline-none focus-visible:outline-none
                  focus:ring-0 focus-visible:ring-0 focus:shadow-none
                  focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  Schedule Date & Time
                </Label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="border-2 rounded-xl p-4 h-12 px-4 text-base resize-none
                  focus:outline-none focus-visible:outline-none
                  focus:ring-0 focus-visible:ring-0 focus:shadow-none
                  focus:border-purple-500 transition-colors"
                    placeholder="Select date and time"
                  />
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 px-2">
                  Choose when you want to be reminded
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Send className="h-4 w-4 text-purple-600" />
                  Email Notification
                </Label>
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3 px-1">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.email || "No email found"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Notification will be sent to your registered email
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-green-100 rounded-full border-2 border-green-200">
                      <span className="text-xs font-medium text-green-700">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 h-12 text-base rounded-xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Reminder...
                  </>
                ) : (
                  <>
                    <Bell className="h-5 w-5 mr-2" />
                    Save Reminder
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Timer className="h-6 w-6 text-purple-600" />
            Your Reminders
            <span className="text-sm text-gray-500 font-normal">
              ({reminders.length} total)
            </span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : reminders.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed bg-gradient-to-br from-gray-50 to-purple-50/20">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-purple-100 rounded-full">
                  <Mail className="h-10 w-10 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No reminders yet
                  </h3>
                  <p className="text-sm text-gray-500">
                    Create your first reminder to get started
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reminders.map((reminder) => (
                <ReminderCard
                  key={reminder._id}
                  reminder={reminder}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
