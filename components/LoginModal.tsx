"use client";

import { useAccountManager } from "@/components/ClientProviders";
import AppleSauceLogin from "@/components/Accounts";
import { ModalShell } from "@/components/ui/ModalShell";
import CloseButton from "@/components/ui/CloseButton";

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

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      overlayClassName="backdrop-blur-md bg-black/20 z-50 p-4"
      contentClassName="bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-xl max-w-2xl w-full p-4 md:p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto"
    >
      <CloseButton
        onClick={onClose}
        className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors z-10"
      />

      <AppleSauceLogin
        manager={manager}
        onSave={() => manualSave.next()}
        onLogin={onLogin}
        onClose={onClose}
      />
    </ModalShell>
  );
}
