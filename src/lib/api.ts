// src/lib/api.ts
interface AdminStats {
  totalUsers: number;
  totalReports: number;
  totalReminders: number;
  activeUsers: number;
  recentActivity: { date: string; scans: number }[];
  severityDistribution: { name: string; value: number }[];
  reminderStats: { pending: number; sent: number; failed: number };
  stageDistribution: { name: string; value: number }[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  role: string;
  scanCount?: number;
  lastActive?: string;
}

interface UserReport {
  _id: string;
  createdAt: string;
  severity: string;
  stage: string;
  confidence: number;
}

interface UserReminder {
  _id: string;
  message: string;
  scheduledFor: string;
  status: string;
  type: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const RAG_BASE_URL = import.meta.env.VITE_RAG_URL || "http://localhost:8502";

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Read token fresh from localStorage on each request to avoid stale-token issues.
   */
  private getToken(): string | null {
    try {
      return localStorage.getItem("token");
    } catch (e) {
      return null;
    }
  }

  private getHeaders(extra: HeadersInit = {}): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      ...extra,
    };

    if (
      !("Content-Type" in (headers as any)) &&
      !(headers as any)["SkipJson"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Remove helper flag if present
    if ((headers as any)["SkipJson"]) {
      delete (headers as any)["SkipJson"];
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: this.getHeaders(options.headers || {}),
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkErr: any) {
      // network-level error
      throw new Error(networkErr?.message ?? "Network error");
    }

    // Try to parse JSON safely; some endpoints may return 204 No Content
    const contentType = response.headers.get("content-type") || "";
    let parsed: any = null;
    if (response.status !== 204 && contentType.includes("application/json")) {
      try {
        parsed = await response.json();
      } catch (e) {
        // Broken JSON — still proceed to throw with status
        parsed = null;
      }
    } else if (response.status !== 204 && contentType.includes("text/")) {
      // Some endpoints may return plain text
      parsed = { text: await response.text() };
    }

    if (!response.ok) {
      // Prefer server-provided error message when possible
      const serverMessage =
        parsed &&
        (parsed.error || parsed.message || parsed.detail || parsed.text);
      const statusMsg = `HTTP ${response.status} ${response.statusText}`;
      throw new Error(
        serverMessage ? `${statusMsg} — ${serverMessage}` : statusMsg
      );
    }

    // If parsed is null (e.g., 204 or empty body) return empty object to satisfy callers
    return (parsed ?? ({} as any)) as T;
  }

  // Authentication

  async login(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: any;
      message?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response?.token) this.setToken(response.token);
    if (response?.user)
      localStorage.setItem("user", JSON.stringify(response.user));
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }) {
    const response = await this.request<{
      token: string;
      user: any;
      message?: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response?.token) this.setToken(response.token);
    if (response?.user)
      localStorage.setItem("user", JSON.stringify(response.user));
    return response;
  }

  async adminLogin(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: any;
      message?: string;
    }>("/auth/admin-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response?.token) this.setToken(response.token);
    if (response?.user)
      localStorage.setItem("user", JSON.stringify(response.user));
    return response;
  }

  async logout() {
    try {
      // best-effort POST to server; if it fails, still clear local state
      await this.request("/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      this.clearToken();
      try {
        localStorage.removeItem("user");
      } catch (e) {}
    }
  }

  async getCurrentUser() {
    return await this.request<{ success: boolean; user: any }>("/auth/me");
  }

  // --- Profile ---

  async updateProfile(profileData: any) {
    return await this.request<{ user: any; message?: string }>(
      "/users/profile",
      {
        method: "PUT",
        body: JSON.stringify(profileData),
      }
    );
  }

  async updateMedicalHistory(medicalHistory: any) {
    return await this.request<{ user: any; message?: string }>(
      "/users/medical-history",
      {
        method: "PUT",
        body: JSON.stringify({ medicalHistory }),
      }
    );
  }

  async updateEyeData(eyeData: any) {
    return await this.request<{ user: any; message?: string }>(
      "/users/eye-data",
      {
        method: "PUT",
        body: JSON.stringify({ eyeData }),
      }
    );
  }

  // --- Doctors ---

  async getNearbyDoctors(
    lat: number,
    lng: number,
    maxDistance = 50,
    specialization?: string
  ) {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      maxDistance: maxDistance.toString(),
    });
    if (specialization) params.append("specialization", specialization);

    return await this.request<{ doctors: any[]; count?: number }>(
      `/doctors/nearby?${params.toString()}`
    );
  }

  async getAllDoctors(
    filters: {
      specialization?: string;
      city?: string;
      rating?: number;
      limit?: number;
      page?: number;
    } = {}
  ) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null)
        params.append(key, value.toString());
    });

    return await this.request<{ doctors: any[]; pagination?: any }>(
      `/doctors?${params.toString()}`
    );
  }

  async getDoctorById(id: string) {
    return await this.request<{ doctor: any }>(
      `/doctors/${encodeURIComponent(id)}`
    );
  }

  async createDoctorProfile(doctorData: any) {
    return await this.request<{ doctor: any; message?: string }>("/doctors", {
      method: "POST",
      body: JSON.stringify(doctorData),
    });
  }

  async addDoctorReview(
    doctorId: string,
    review: { rating: number; comment?: string }
  ) {
    return await this.request<{ doctor: any; message?: string }>(
      `/doctors/${encodeURIComponent(doctorId)}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(review),
      }
    );
  }

  // Chat/AI 

  async askAI(message: string, context?: string) {
    return await this.request<{ response: string; timestamp: string }>(
      "/chat/ask",
      {
        method: "POST",
        body: JSON.stringify({ message, context }),
      }
    );
  }

  async analyzeSymptoms(
    symptoms: string[],
    duration?: string,
    severity?: string
  ) {
    return await this.request<{
      analysis: string;
      timestamp: string;
      disclaimer?: string;
    }>("/chat/symptoms", {
      method: "POST",
      body: JSON.stringify({ symptoms, duration, severity }),
    });
  }

  async getEducationalContent(topic: string, level = "basic") {
    return await this.request<{
      content: string;
      topic: string;
      level: string;
      timestamp: string;
    }>("/chat/education", {
      method: "POST",
      body: JSON.stringify({ topic, level }),
    });
  }

  // Uploads (multipart) 
  // For fetch with form-data we avoid setting "Content-Type" header so browser sets boundary for us.
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    const url = `${this.baseURL}/api/upload/image`;
    const token = this.getToken() || "";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        // skip content-type so browser sets the correct multipart boundary
        // helper flag removed in request headers path: not used here
      },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Image upload failed: ${res.status}`);
    }
    return await res.json();
  }

  async uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    const url = `${this.baseURL}/api/upload/profile-image`;
    const token = this.getToken() || "";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody.error || `Profile image upload failed: ${res.status}`
      );
    }
    return await res.json();
  }

  // Auth helpers 

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setToken(token: string) {
    try {
      localStorage.setItem("token", token);
    } catch (e) {
      console.warn("Could not persist token to localStorage", e);
    }
  }

  clearToken() {
    try {
      localStorage.removeItem("token");
    } catch (e) {}
  }

  // RAG Chat

  private ragHeaders() {
    const token = this.getToken() || "";
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  async ragSendMessage(message: string, chatId?: string) {
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`${RAG_BASE_URL}/api/rag/chat`, {
      method: "POST",
      headers: this.ragHeaders(),
      body: JSON.stringify({
        message,
        chat_id: chatId,
        top_k: 5,
        timezone: clientTimezone,
      }),
    });

    if (!res.ok) {
      throw new Error(`RAG chat failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async ragGetChats() {
    const res = await fetch(`${RAG_BASE_URL}/api/rag/chats`, {
      headers: this.ragHeaders(),
    });
    if (!res.ok) throw new Error(`Get RAG chats failed: ${res.status}`);
    return res.json();
  }

  async ragGetMessages(chatId: string) {
    const res = await fetch(
      `${RAG_BASE_URL}/api/rag/chats/${encodeURIComponent(chatId)}/messages`,
      {
        headers: this.ragHeaders(),
      }
    );
    if (!res.ok) throw new Error(`Get RAG messages failed: ${res.status}`);
    return res.json();
  }

  async ragDeleteChat(chatId: string) {
    const res = await fetch(
      `${RAG_BASE_URL}/api/rag/chats/${encodeURIComponent(chatId)}`,
      {
        method: "DELETE",
        headers: this.ragHeaders(),
      }
    );
    if (!res.ok) throw new Error(`Delete RAG chat failed: ${res.status}`);
    return res.json();
  }

  async ragRenameChat(chatId: string, newTitle: string) {
    const res = await fetch(
      `${RAG_BASE_URL}/api/rag/chats/${encodeURIComponent(chatId)}`,
      {
        method: "PATCH",
        headers: this.ragHeaders(),
        body: JSON.stringify({ title: newTitle }),
      }
    );
    if (!res.ok) throw new Error(`Rename RAG chat failed: ${res.status}`);
    return res.json();
  }

  async ragArchiveChat(chatId: string, archived = true) {
    const res = await fetch(
      `${RAG_BASE_URL}/api/rag/chats/${encodeURIComponent(chatId)}`,
      {
        method: "PATCH",
        headers: this.ragHeaders(),
        body: JSON.stringify({ archived }),
      }
    );
    if (!res.ok) throw new Error(`Archive RAG chat failed: ${res.status}`);
    return res.json();
  }

  async ragShareChat(chatId: string) {
    const res = await fetch(
      `${RAG_BASE_URL}/api/rag/chats/${encodeURIComponent(chatId)}/share`,
      {
        method: "POST",
        headers: this.ragHeaders(),
      }
    );
    if (!res.ok) throw new Error(`Share RAG chat failed: ${res.status}`);
    return res.json();
  }

  // Admin endpoints

  async getAdminStats() {
    return await this.request<any>("/admin/stats");
  }

  async getAdminUsers(search?: string, page = 1, limit = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);
    return await this.request<any>(`/admin/users?${params.toString()}`);
  }

  async getUserReports(userId: string) {
    return await this.request<any>(
      `/admin/users/${encodeURIComponent(userId)}/reports`
    );
  }

  async getUserReminders(userId: string) {
    return await this.request<any>(
      `/admin/users/${encodeURIComponent(userId)}/reminders`
    );
  }

  async getRAGDocuments() {
    return await this.request<any>("/admin/rag/documents");
  }

  async deleteUser(userId: string) {
    return await this.request<any>(
      `/admin/users/${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
  }

  async deleteRAGDocument(docId: string) {
    return await this.request<any>(
      `/admin/rag/documents/${encodeURIComponent(docId)}`,
      { method: "DELETE" }
    );
  }
}

export const apiService = new ApiService();
export default apiService;