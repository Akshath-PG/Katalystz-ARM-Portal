"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import zxcvbn from "zxcvbn";

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use zxcvbn for advanced password strength calculation
  const strengthResult = zxcvbn(newPassword);
  
  // zxcvbn returns a score from 0 to 4
  const strength = strengthResult.score;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: "", color: "bg-gray-200", text: "" };
    if (strength <= 2) return { label: "Weak", color: "bg-red-500", text: "text-red-500" };
    if (strength === 3) return { label: "Fair", color: "bg-yellow-500", text: "text-yellow-600" };
    return { label: "Strong", color: "bg-green-500", text: "text-green-500" };
  };

  const strengthData = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword === oldPassword) {
      setError("New password cannot be the same as your old password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (strength < 3) {
      setError("Please choose a stronger password (must be Fair or Strong).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred");
      } else {
        setSuccess(true);
        // Logout immediately after successful password change
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 1500);
      }
    } catch (err) {
      setError("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-heading">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences and security.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-lg">
            <KeyRound className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 font-heading">Change Password</h2>
            <p className="text-sm text-gray-500">Ensure your account is using a long, random password to stay secure.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 text-sm">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              Password updated successfully! Logging you out...
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {newPassword.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500 font-medium">Password strength</span>
                  <span className={`text-xs font-bold ${strengthData.text}`}>{strengthData.label}</span>
                </div>
                <div className="flex gap-1 h-1.5">
                  <div className={`flex-1 rounded-full ${strength > 0 ? strengthData.color : 'bg-gray-200'}`}></div>
                  <div className={`flex-1 rounded-full ${strength > 1 ? strengthData.color : 'bg-gray-200'}`}></div>
                  <div className={`flex-1 rounded-full ${strength > 2 ? strengthData.color : 'bg-gray-200'}`}></div>
                  <div className={`flex-1 rounded-full ${strength > 3 ? strengthData.color : 'bg-gray-200'}`}></div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${
                confirmPassword.length > 0 
                  ? newPassword === confirmPassword 
                    ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                    : 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300'
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword.length > 0 && (
              <div className="mt-2 text-xs font-medium flex items-center gap-1">
                {newPassword === confirmPassword ? (
                  <span className="text-green-600">Passwords match</span>
                ) : (
                  <span className="text-red-500">Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading || success}
              className="bg-brand-500 text-white font-medium py-2 px-6 rounded-lg hover:bg-brand-600 focus:ring-4 focus:ring-brand-100 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
