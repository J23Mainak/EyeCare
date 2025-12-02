import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar,
  Image,
  Camera,
  Eye,
  CheckCircle,
  XCircle,
  ClipboardList,
  Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000";

interface Report {
  _id: string;
  imageUrl: string;
  stage: number;
  stageLabel: string;
  reportText: string;
  createdAt: string;
  probabilities: number[];
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

export default function Reports() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [notification, setNotification] = useState<ToastNotification | null>(
    null
  );
  const { token } = useAuth();

  useEffect(() => {
    fetchReports();
  }, []);

  const showNotification = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    const id = Date.now().toString();
    setNotification({ id, type, title, message });

    setTimeout(() => {
      setNotification(null);
    }, 10000);
  };

  const fetchReports = async () => {
    try {
      const authToken = token || localStorage.getItem("token");
      if (!authToken) {
        console.log("No auth token, skipping fetch");
        setLoadingReports(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/reports`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        console.error("Fetch reports failed:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const authToken = token || localStorage.getItem("token");
    if (!authToken) {
      showNotification(
        "error",
        "Authentication Required",
        "Please log in to upload images."
      );
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      console.log("Uploading to Cloudinary...");

      const uploadRes = await fetch(`${API_BASE}/api/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        console.error("Upload failed:", errorData);
        throw new Error(
          errorData.error || errorData.details || "Image upload failed"
        );
      }

      const uploadData = await uploadRes.json();
      console.log("Upload success:", uploadData.url);

      showNotification(
        "success",
        "Image Uploaded Successfully!",
        "Your retina image has been uploaded. Starting AI analysis..."
      );

      setUploading(false);
      setAnalyzing(true);

      console.log("Starting analysis...");

      const analyzeRes = await fetch(
        `${API_BASE}/api/reports/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            imageUrl: uploadData.url,
            publicId: uploadData.publicId,
          }),
        }
      );

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json().catch(() => ({}));
        console.error("Analysis failed:", errorData);
        throw new Error(errorData.error || "Analysis failed");
      }

      const analyzeData = await analyzeRes.json();
      console.log("Analysis complete:", analyzeData);

      setPrediction(analyzeData.report);

      showNotification(
        "success",
        "Analysis Complete!",
        `Your retina scan has been analyzed. Stage: ${analyzeData.report.stageLabel}`
      );

      await fetchReports();
    } catch (err: any) {
      console.error("Upload/Analysis error:", err);
      showNotification(
        "error",
        "Upload/Analysis Failed!",
        err.message || "An error occurred. Please try again."
      );
    } finally {
      setUploading(false);
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getSeverityColor = (stage: number) => {
    const colors = [
      "text-green-700 bg-green-100 border-green-200",
      "text-blue-600 bg-blue-50 border-blue-200",
      "text-yellow-600 bg-yellow-50 border-yellow-200",
      "text-orange-600 bg-orange-50 border-orange-200",
      "text-red-600 bg-red-50 border-red-200",
    ];
    return colors[stage] || colors[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="container py-5 space-y-8 bg-[#FAF9F6]">
      {notification && (
        <ToastNotification
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="flex items-baseline justify-between">
        <div className="mb-4">
          <div className="flex items-center gap-3 px-1">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-white relative -top-0.5" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold">Retina Analysis Reports</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Image className="h-4 w-4 text-amber-600" />
                Upload retina images for AI-powered diabetic retinopathy
                screening
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleButtonClick}
          disabled={uploading || analyzing}
          className="bg-gradient-to-r py-2 from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Upload Retina Image
            </>
          )}
        </Button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {prediction && (
        <Card className="overflow-hidden border-2 shadow-lg">
          <div className="bg-gradient-to-r from-blue-200 to-indigo-200 p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Star className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Latest Analysis Result
                  </h3>
                  <p className="text-sm text-gray-600">Just completed</p>
                </div>
              </div>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getSeverityColor(
                  prediction.stage
                )}`}
              >
                {prediction.stageLabel}
              </span>
            </div>
          </div>
          <div className="p-6 bg-white">
            <div className="space-y-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Stage Classification-
                  </h4>
                  <p className="text-2xl font-bold text-gray-900">
                    Stage {prediction.stage}
                  </p>
                </div>

                {prediction.imageUrl && (
                  <div className="flex-shrink-0 text-right">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Analyzed Image
                    </h4>
                    <div className="flex-auto justify-items">
                      <img
                        src={prediction.imageUrl}
                        alt="Retina scan"
                        className="h-20 w-24 rounded-lg shadow-md border-2 border-gray-200"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Clinical Report-
                </h4>
                <p className="text-gray-700 leading-relaxed bg-gray-100 p-3 rounded-lg border">
                  {prediction.reportText}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4 px-4">
          <ClipboardList className="h-5 w-5 text-gray-600" />
          <h3 className="text-2xl font-bold text-gray-900">Reports History</h3>
          <span className="text-sm text-gray-500">
            ({reports.length} total)
          </span>
        </div>

        {loadingReports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <Eye className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  No reports yet
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Upload your first retina image to get started with AI
                  screening
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4 px-2">
            {reports.map((report, idx) => (
              <Card
                key={report._id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border-l-4"
                style={{
                  borderLeftColor:
                    report.stage === 0
                      ? "#10b981"
                      : report.stage === 1
                      ? "#3b82f6"
                      : report.stage === 2
                      ? "#eab308"
                      : report.stage === 3
                      ? "#f97316"
                      : "#ef4444",
                }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Report #{reports.length - idx}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(
                            report.stage
                          )}`}
                        >
                          {report.stageLabel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Analysis Result
                      </h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border leading-relaxed">
                        {report.reportText}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Retina Image
                      </h4>
                      <img
                        src={report.imageUrl}
                        alt="Retina scan"
                        className="w-full h-48 object-cover rounded-lg shadow-sm border-2 border-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}