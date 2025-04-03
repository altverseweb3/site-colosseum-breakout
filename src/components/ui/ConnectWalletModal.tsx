"use client";

import { useState } from "react";
import Image from "next/image";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { connectMetamask } from "@/utils/walletMethods";
import { toast } from "sonner";
import { WalletInfo, WalletType } from "@/types/web3";
import { cn } from "@/lib/utils";

type WalletOption = {
  id: WalletType;
  name: string;
  icon: string;
  disabled: boolean;
  background: string;
  connectMethod: () => Promise<WalletInfo | null>;
};

export const ConnectWalletModal = ({
  trigger,
  onSuccess,
}: {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState<WalletType | null>(null);

  const walletOptions: WalletOption[] = [
    {
      id: WalletType.METAMASK,
      name: "MetaMask",
      icon: "/wallets/metamask.svg",
      disabled: false,
      background: "bg-[#E27625]/20",
      connectMethod: connectMetamask,
    },
    {
      id: WalletType.COINBASE,
      name: "Coinbase",
      icon: "/wallets/coinbase.svg",
      disabled: true,
      background: "bg-[#1951E3]/20",
      connectMethod: async () => null,
    },
    {
      id: WalletType.WALLET_CONNECT,
      name: "WalletConnect",
      icon: "/wallets/walletconnect.svg",
      disabled: true,
      background: "bg-[#217FFC]/20",
      connectMethod: async () => null,
    },
  ];

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (wallet.disabled) {
      toast(`${wallet.name} integration coming soon!`);
      return;
    }

    try {
      setConnecting(wallet.id);
      console.log(`Connecting to ${wallet.name}...`);

      const result = await wallet.connectMethod();

      if (result) {
        setOpen(false);
        if (onSuccess) onSuccess();
      } else {
        toast(`Failed to connect to ${wallet.name}.`);
      }
    } catch (error) {
      console.error(`Error connecting to ${wallet.name}:`, error);
      toast(`Failed to connect to ${wallet.name}.`);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger className="flex items-center gap-2 px-4 py-2 rounded-md border border-amber-600 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-500 hover:from-amber-500/20 hover:to-amber-500/10 transition-colors">
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:w-1/2 w-2/3 rounded-lg bg-[#18181B] border-[#27272A] border 
  [&>button]:!focus:ring-0 [&>button]:!focus:ring-offset-0 [&>button]:!focus:outline-none
  [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] 
  [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] 
  [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px]"
      >
        {" "}
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA]">select wallet</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {walletOptions.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className={cn(
                "w-full flex items-center justify-between px-3 py-6 rounded-md bg-[#18181B] border border-[#27272A] transition-colors",
                wallet.disabled
                  ? "text-[#52525b]"
                  : "text-[#FAFAFA] hover:bg-[#27272A]",
              )}
              onClick={() => handleWalletSelect(wallet)}
              disabled={wallet.disabled || connecting !== null}
            >
              <div className="flex items-center">
                <span className="font-medium">{wallet.name}</span>
                {connecting === wallet.id && (
                  <span className="ml-3 text-xs text-amber-500">
                    connecting...
                  </span>
                )}
              </div>

              <div
                className={`h-8 w-8 relative flex items-center justify-center rounded-md ${
                  wallet.background
                }`}
              >
                <Image
                  src={wallet.icon}
                  alt={wallet.name}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;
