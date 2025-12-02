// src/components/layout/SiteHeader.tsx
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, UserCog, Crown } from "lucide-react";

let axios: any = null;
try {
  axios = require("axios").default;
} catch (err) {
  axios = null;
}

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/doctors", label: "Doctors" },
  { to: "/reports", label: "Reports" },
  { to: "/chat", label: "Chat" },
  { to: "/reminders", label: "Reminders" },
];

export default function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);

  // Read user from localStorage
  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem("user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch (err) {
        console.error("Failed parsing user from localStorage", err);
        setUser(null);
      }
    };

    readUser();

    const onStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        ["user", "token", "currentUserId", "rememberMe"].includes(e.key)
      ) {
        readUser();
        window.dispatchEvent(
          new CustomEvent("auth-changed", {
            detail: {
              user: localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")!)
                : null,
            },
          })
        );
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", () => readUser());
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", () => readUser());
    };
  }, []);

  // Smooth progressive scroll behavior
  useEffect(() => {
    let ticking = false;
    const threshold = 10;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Update scrolled state for styling
          setScrolled(currentScrollY > 20);

          // Progressive hide/show logic
          if (currentScrollY > 100) {
            if (currentScrollY > lastScrollY + threshold) {
              // Scrolling down
              setHideOnScroll(true);
              setIsScrollingUp(false);
            } else if (currentScrollY < lastScrollY - threshold) {
              // Scrolling up
              setHideOnScroll(false);
              setIsScrollingUp(true);
            }
          } else {
            // Near top, always show
            setHideOnScroll(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          if (axios) {
            await axios.post(
              "/api/auth/logout",
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000,
              }
            );
          } else {
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
          }
        } catch (e) {
          console.warn("Backend logout failed:", e);
        }
      }

      const keysToRemove = ["token", "user", "currentUserId", "rememberMe"];
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      if (axios?.defaults?.headers?.common) {
        delete axios.defaults.headers.common["Authorization"];
      }

      window.dispatchEvent(
        new CustomEvent("auth-changed", { detail: { user: null } })
      );

      navigate("/", { replace: true });
      setTimeout(() => window.location.reload(), 120);
    } catch (error) {
      console.error("Sign out error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
  };

  // small util: user initials for avatar
  const initials = (() => {
    if (!user) return null;
    const name = user?.name ?? user?.fullName ?? user?.email ?? "";
    return name
      .split(" ")
      .map((s: string) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  })();

  return (
    <>
      {/* Main Header */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-400 ease-out bg-muted",
          hideOnScroll
            ? "-translate-y-full opacity-0"
            : "translate-y-0 opacity-100"
        )}
      >
        <div
          className={cn(
            "relative transition-colors duration-300 border-b border-slate-200",
            scrolled
              ? "bg-white/6 backdrop-blur-md shadow-lg border-b border-white/6"
              : "bg-white/4 backdrop-blur-sm"
          )}
          style={{ WebkitBackdropFilter: "blur(8px)" }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex h-14 items-center justify-between gap-3">
              {/* Logo / Brand - left-aligned with rounded top-left visual */}
              <div className="flex items-center gap-3 px-12"></div>

              {/* Desktop Navigation (center/right) */}
              <nav className="hidden md:flex items-center gap-1">
                {nav.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      cn(
                        "group relative px-4 py-2 rounded-md font-semibold text-base transition-all duration-200",
                        isActive
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative z-10">{n.label}</span>

                        {/* animated underline */}
                        <span
                          className={cn(
                            "absolute left-4 right-4 bottom-1 h-[3px] rounded-full transition-all duration-300 transform origin-left scale-x-0",
                            isActive
                              ? "scale-x-100 bg-gradient-to-r from-blue-400 to-blue-400 opacity-100"
                              : "bg-slate-200 dark:bg-white/6 group-hover:scale-x-100"
                          )}
                          aria-hidden
                        />

                        {/* hover background highlight */}
                        <span className="absolute inset-0 rounded-md bg-transparent group-hover:bg-slate-100/60 dark:group-hover:bg-white/3 transition-colors duration-200" />
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Right side: actions and mobile toggle */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-3">
                  {user && user.role === "admin" && (
                    <Button
                      asChild
                      variant="ghost"
                      className="text--500 bg-teal-600 text-white hover:bg-teal-700 hover:text-white transition-colors duration-200"
                    >
                      <Link to="/admin" className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>Admin</span>
                      </Link>
                    </Button>
                  )}

                  {!user ? (
                    <Button
                      asChild
                      className="bg-gradient-to-r from-teal-600 to-teal-600 text-white border-0 shadow-md hover:scale-[1.02] transform transition-all duration-200"
                    >
                      <Link to="/auth">Sign In</Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="bg-red-600 text-white border-0 shadow-md hover:bg-red-700 hover:text-white transform transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign Out
                    </Button>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-expanded={mobileOpen}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  className="md:hidden relative p-2 text-slate-700 dark:text-white hover:bg-blue-100 rounded-md transition-all duration-200"
                >
                  <div className="relative w-6 h-6">
                    <Menu
                      className={cn(
                        "absolute inset-0 transition-all duration-300 origin-center",
                        mobileOpen
                          ? "rotate-90 opacity-0 scale-50"
                          : "rotate-0 opacity-100 scale-100"
                      )}
                    />
                    <X
                      className={cn(
                        "absolute inset-0 transition-all duration-300 origin-center",
                        mobileOpen
                          ? "rotate-0 opacity-100 scale-100"
                          : "-rotate-90 opacity-0 scale-50"
                      )}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-opacity duration-200",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-down Menu */}
        <div
          className={cn(
            "absolute left-4 right-4 top-14 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/10 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 transition-all duration-200",
            mobileOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-4 opacity-0"
          )}
        >
          <nav className="p-3 space-y-2">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "block px-4 py-3 rounded-lg font-medium transition-all duration-150",
                    isActive
                      ? "bg-blue-100/80 dark:bg-blue-900/30 text-slate-900 dark:text-white border border-blue-200/30"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-blue-200/60 dark:hover:bg-blue-900/20"
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}

            <div className="pt-2 mt-2 border-t border-slate-200/8 space-y-2">
              {user && user.role === "admin" && (
                <Link
                  to="/admin"
                  className="flex items-center px-4 py-3 rounded-lg text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 hover:bg-teal-600 hover:text-white transition-all duration-150"
                >
                  <Crown className="h-5 w-5 mr-3" />
                  <span className="font-medium">Admin Panel</span>
                </Link>
              )}

              {!user ? (
                <Link
                  to="/auth"
                  className="block text-center px-4 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-teal-600 text-white font-medium transition-all duration-150 hover:from-teal-700 hover:to-teal-700"
                >
                  Sign In
                </Link>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-3 rounded-lg text-slate-700 dark:text-white hover:bg-red-600 hover:text-white transition-all duration-150 font-medium"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Spacer to push page content below header */}
      <div className="h-14" aria-hidden="true" />
    </>
  );
}
