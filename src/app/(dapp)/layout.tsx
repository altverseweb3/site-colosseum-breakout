import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import TokenInitializer from "@/components/meta/TokensInitializer";
import { AppKit } from "@/components/meta/WalletContext";

export default async function DAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppKit>
      <div className="flex flex-col h-dvh">
        <TokenInitializer />
        <SiteHeader />
        <main className="container mx-auto flex-1 md:h-screen pt-6 px-2 sm:px-4">
          {children}
        </main>
        <SiteFooter />
      </div>
    </AppKit>
  );
}
