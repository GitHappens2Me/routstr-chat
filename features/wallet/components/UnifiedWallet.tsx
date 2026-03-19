import React from "react";
import SixtyWallet from "./SixtyWallet";

interface UnifiedWalletProps {
  mintUrl: string;
}

const UnifiedWallet: React.FC<UnifiedWalletProps> = ({ mintUrl }) => {
  return (
    <div className="space-y-6">
      <SixtyWallet mintUrl={mintUrl} />
    </div>
  );
};

export default UnifiedWallet;
