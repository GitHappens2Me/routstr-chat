"use client";

import React from "react";
import QRCode from "react-qr-code";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: string;
  amount: string;
  unit: string;
}

/**
 * Centered QR code modal that displays above all other components
 */
const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  invoice,
  amount,
  unit,
}) => {
  if (!isOpen || !invoice) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-card border border-border rounded-lg max-w-[90vw] w-full sm:max-w-md p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-background rounded-lg p-3">
            <QRCode
              value={invoice}
              size={280}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          {amount && (
            <div className="text-xs text-muted-foreground">
              {amount} {unit}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
