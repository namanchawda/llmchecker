"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useAppView } from "../app/context/AppViewContext";
import { LogOut } from "lucide-react";

type Props = {
  onProfileClick?: () => void;
  onMonitorClick?: () => void;
};

/* ── Logout confirmation modal ─────────────────────────────── */
function LogoutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-[#0d0f16] border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/5 border border-white/10 mx-auto mb-4">
          <LogOut className="w-5 h-5 text-slate-300" />
        </div>

        <h3 className="text-base font-bold text-white text-center mb-1">Sign out?</h3>
        <p className="text-sm text-slate-400 text-center mb-6">
          {/* You'll be returned to the home page. */}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────── */
export function AuthHeader({ onProfileClick, onMonitorClick }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { setView } = useAppView();

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) setShowHeader(true);
      else if (currentScrollY > lastScrollY) setShowHeader(false);
      else setShowHeader(true);
      setLastScrollY(currentScrollY);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  function handleLogoutConfirm() {
    logout();
    setShowLogoutModal(false);
    setView("HOME"); // drop back to LLM Monitor home
  }

  return (
    <>
      <header
        className={`
          sticky top-0 z-50 w-full pb-0 pt-2
          transition-transform duration-300 ease-in-out
          ${showHeader ? "translate-y-0" : "-translate-y-full"}
        `}
      >
        <div className="card mx-auto w-full px-6">
          <div className="!p-0 flex items-center justify-between h-[32px] px-6">

            {/* LEFT — LOGO */}
            <div
              onClick={() => setView("HOME")}
              className="text-lg font-semibold tracking-tight cursor-pointer text-slate-200 hover:text-white transition"
            >
              LLM Monitor
            </div>

            {/* RIGHT — AUTH */}
            {!user ? (
              <button
                onClick={() => router.push("/login")}
                className="text-sm px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-slate-200 transition shadow-sm"
              >
                Sign in
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView("MONITOR")}
                  className="text-sm px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 inline-block transition"
                >
                  Monitor
                </button>

                {/* User pill */}
                <button
                  onClick={() => setView("PROFILE")}
                  className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition"
                >
                  {user.name}
                </button>

                {/* Logout — triggers modal */}
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="text-sm px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}