import React, { createContext, useContext, useEffect, useState } from "react";
import apiService from "@/lib/api";

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin" | "doctor";
  profileImage?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);

          const lastUserId = localStorage.getItem("currentUserId");
          if (lastUserId && lastUserId !== parsedUser._id) {
            console.log(
              "Different user detected, clearing old session data"
            );

            const allKeys = Object.keys(localStorage);
            allKeys.forEach((key) => {
              if (
                key !== "token" &&
                key !== "user" &&
                key !== "currentUserId" &&
                !["theme", "language"].includes(key)
              ) {
                localStorage.removeItem(key);
              }
            });
          }

          // Set current user ID for tracking
          localStorage.setItem("currentUserId", parsedUser._id);

          apiService.setToken(savedToken);
          setToken(savedToken);
          setUser(parsedUser);

          // Verify token is still valid
          try {
            const { user: currentUser } = await apiService.getCurrentUser();
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
            localStorage.setItem("currentUserId", currentUser._id);
          } catch (error) {
            console.error("Token validation failed:", error);
            await logout();
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        await logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      setUser(response.user);
      setToken(response.token || localStorage.getItem("token"));
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiService.register(userData);
      setUser(response.user);
      setToken(response.token || localStorage.getItem("token"));
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      const response = await apiService.adminLogin(email, password);
      setUser(response.user);
      setToken(response.token || localStorage.getItem("token"));
    } catch (error) {
      console.error("Admin login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      const keysToPreserve = ["theme", "language"]; 
      const allKeys = Object.keys(localStorage);

      allKeys.forEach((key) => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear state
      setUser(null);
      setToken(null);
      apiService.clearToken();

      console.log("User session cleared completely");
    }
  };

  const updateUser = (userData: any) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    adminLogin,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
