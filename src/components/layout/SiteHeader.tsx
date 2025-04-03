"use client";

import { MainNav } from "@/components/layout/MainNav";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import useWeb3Store from "@/store/web3Store";
import { disconnectMetamask, truncateAddress } from "@/utils/walletMethods";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { Menu } from "lucide-react";
import BrandedButton from "@/components/ui/BrandedButton";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import Link from "next/link";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const activeWallet = useWeb3Store((state) => state.activeWallet);

  useEffect(() => {
    const handleResize = () => {
      // Check if window width is at or above the md breakpoint
      if (window.innerWidth >= 768 && isOpen) {
        setIsOpen(false);
      }
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]); // Only re-run if isOpen changes

  const handleDisconnect = async () => {
    if (activeWallet) {
      try {
        await disconnectMetamask();
        setIsOpen(false); // Close the sheet after disconnecting
      } catch (error) {
        toast("Failed to disconnect wallet.");
        console.error("Failed to disconnect wallet: ", error);
      }
    }
  };

  const handleSheetClose = () => {
    setIsOpen(false);
  };

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="flex h-14 items-center px-4">
        {/* Logo and Nav Container */}
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-3" href="/">
            <Image
              src="/tokens/branded/ALT.svg"
              alt="Altverse Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-xl font-normal">altverse</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <MainNav onNavigate={() => void 0} />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-4">
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="mr-0 px-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[360px] [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px] [&_button]:focus:ring-0 [&_button]:focus:ring-offset-0 [&_button]:focus:outline-none"
            >
              <SheetHeader>
                <SheetTitle>
                  <div
                    className="flex items-center gap-3"
                    onClick={() => setIsOpen(false)}
                  >
                    <Image
                      src="/tokens/branded/ALT.svg"
                      alt="Altverse Logo"
                      width={24}
                      height={24}
                      className="h-6 w-6"
                      priority
                    />
                    <span className="text-lg font-normal">altverse</span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-6">
                <nav className="flex flex-col gap-2">
                  <MainNav onNavigate={() => setIsOpen(false)} />
                </nav>
                {activeWallet ? (
                  <BrandedButton
                    className="md:inline-flex whitespace-nowrap text-sm h-[30px]"
                    iconClassName="h-4 w-4"
                    onClick={handleDisconnect}
                    iconName="Wallet"
                    buttonText={truncateAddress(activeWallet.address)}
                  />
                ) : (
                  <ConnectWalletModal
                    onSuccess={handleSheetClose}
                    trigger={
                      <BrandedButton
                        className="md:inline-flex whitespace-nowrap text-sm h-[30px]"
                        iconClassName="h-4 w-4"
                        iconName="Wallet"
                        buttonText="connect wallet"
                      />
                    }
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Wallet Button */}
          {activeWallet ? (
            <BrandedButton
              className="hidden md:inline-flex whitespace-nowrap text-sm h-[30px]"
              iconClassName="h-4 w-4"
              onClick={handleDisconnect}
              iconName="Wallet"
              buttonText={truncateAddress(activeWallet.address)}
            />
          ) : (
            <ConnectWalletModal
              trigger={
                <BrandedButton
                  className="hidden md:inline-flex whitespace-nowrap text-sm h-[30px]"
                  iconClassName="h-4 w-4"
                  iconName="Wallet"
                  buttonText="connect wallet"
                />
              }
            />
          )}
        </div>
      </div>
    </header>
  );
}
