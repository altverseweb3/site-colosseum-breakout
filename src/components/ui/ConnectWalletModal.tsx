"use client";

import { useState, useRef } from "react";
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
import { toast } from "sonner";
import { WalletInfo, WalletType } from "@/types/web3";
import { cn } from "@/lib/utils";
import { useAppKit } from "@reown/appkit/react";
import { ConnectButton } from "@suiet/wallet-kit";

// Custom wrapper for Suiet wallet
const CustomSuiConnectButton = ({ className }: { className?: string }) => {
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleCustomClick = () => {
    console.log("[DEBUG] Custom Sui Button Clicked");

    if (!buttonRef.current) {
      console.error("[DEBUG] buttonRef.current is null or undefined.");
      return;
    }

    console.log("[DEBUG] buttonRef.current:", buttonRef.current);

    const suietButton = buttonRef.current.querySelector("button");

    if (suietButton?.classList.contains("wkit-connected-button")) {
      console.log(
        "[DEBUG] Detected 'wkit-connected-button'. Wallet appears to be already connected.",
      );
      toast.info("Sui wallet already connected.");
    }

    if (!suietButton) {
      console.error(
        "[DEBUG] Could not find the <button> element inside the hidden div.",
      );
      console.log(
        "[DEBUG] Inner HTML of hidden div:",
        buttonRef.current.innerHTML,
      );
      return;
    }

    console.log("[DEBUG] Found suietButton element:", suietButton);

    try {
      console.log("[DEBUG] Attempting to click the hidden suietButton...");
      suietButton.click();
      console.log("[DEBUG] Hidden suietButton.click() executed.");
    } catch (error) {
      console.error(
        "[DEBUG] Error occurred during suietButton.click():",
        error,
      );
      toast.error(
        "An error occurred while trying to trigger the Sui wallet connection.",
      );
    }
  };

  return (
    <div className="relative">
      {/* Hidden Suiet button */}
      <div
        ref={buttonRef}
        className="absolute opacity-0 pointer-events-auto inset-0 z-10"
        style={{ height: "1px", width: "1px", overflow: "hidden" }} // Original hiding styles
      >
        <ConnectButton />
      </div>

      {/* Visible custom button */}
      <Button
        variant="outline"
        className={cn(
          "w-full flex items-center justify-between px-3 py-6 rounded-md bg-[#18181B] border border-[#27272A] transition-colors text-[#FAFAFA] hover:bg-[#27272A]",
          className,
        )}
        onClick={handleCustomClick}
      >
        <div className="flex items-center">
          <span className="font-medium">sui wallets</span>
        </div>
        <div className="flex items-center">
          <Image
            src="/wallets/sui.svg"
            alt="sui wallet icon"
            width={24}
            height={24}
            className="object-contain mx-1"
          />
        </div>
      </Button>
    </div>
  );
};

type WalletOption = {
  id: WalletType;
  name: string;
  icons: string[];
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
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState<WalletType | null>(null);
  const { open: openAppKit } = useAppKit();

  const walletOptions: WalletOption[] = [
    {
      id: WalletType.EVM,
      name: "evm wallets",
      icons: ["/wallets/metamask.svg", "/wallets/walletconnect.svg"],
      disabled: false,
      background: "bg-[#E27625]/0",
      connectMethod: async () => {
        openAppKit();
        return null;
      },
    },
    {
      id: WalletType.SOLANA,
      name: "solana wallets",
      icons: ["/wallets/phantom.svg"],
      disabled: false,
      background: "bg-[#E27625]/0",
      connectMethod: async () => {
        openAppKit();
        return null;
      },
    },
  ];

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (wallet.disabled) {
      toast.info(`${wallet.name} integration coming soon!`);
      return;
    }

    try {
      setConnecting(wallet.id);
      console.log(`Connecting to ${wallet.name}...`);

      const result = await wallet.connectMethod();

      if (result) {
        setModalOpen(false);
        toast.success("Wallet connected successfully.");
        if (onSuccess) onSuccess();
      } else {
        toast.error(`Failed to connect to ${wallet.name}.`);
      }
    } catch (error) {
      console.error(`Error connecting to ${wallet.name}:`, error);
      toast.error(`Failed to connect to ${wallet.name}.`);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
        <div className="flex flex-col gap-3">
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
                className={`h-8 w-auto relative flex items-center justify-center rounded-md ${
                  wallet.background
                }`}
              >
                <div className="flex items-center">
                  {wallet.icons.map((icon, index) => (
                    <Image
                      key={index}
                      src={icon}
                      alt={`${wallet.name} icon ${index + 1}`}
                      width={24}
                      height={24}
                      className="object-contain mx-1"
                    />
                  ))}
                </div>
              </div>
            </Button>
          ))}
          <CustomSuiConnectButton />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;
