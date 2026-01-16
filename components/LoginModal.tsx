"use client";

import { useAccountManager } from "@/components/ClientProviders";
import AppleSauceLogin from "@/components/Accounts";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  logout: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
  logout,
}: LoginModalProps) {
  const { manager, manualSave } = useAccountManager();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-xl max-w-2xl w-full p-4 md:p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors z-10 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <AppleSauceLogin
          manager={manager}
          onSave={() => manualSave.next()}
          onLogin={onLogin}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
