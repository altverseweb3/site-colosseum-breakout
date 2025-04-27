// TokenImage.tsx
import { useState } from "react";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { Token, Chain } from "@/types/web3";

interface TokenImageProps {
  token: Token;
  chain: Chain;
  size?: "sm" | "md" | "lg";
}

export const TokenImage: React.FC<TokenImageProps> = ({
  token,
  chain,
  size = "md",
}) => {
  const [hasError, setHasError] = useState(false);

  // Size classes
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  // Sizes prop for Next.js Image optimization
  const sizesProp = {
    sm: "20px",
    md: "32px",
    lg: "48px",
  };

  // Question mark colors based on size
  const questionMarkSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  // Handle any image loading error
  const handleImageError = () => {
    setHasError(true);
  };

  // Determine the image source based on whether the token is native or not
  const getImageSrc = () => {
    if (token.native) {
      return `/tokens/native/pngs/${token.icon}`;
    }
    return `/tokens/${chain.id}/pngs/${token.icon}`;
  };

  // If there was an error, show the question mark icon
  if (hasError) {
    return (
      <div
        className={`${sizeClasses[size]} flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full`}
      >
        <HelpCircle size={questionMarkSizes[size]} className="text-zinc-400" />
      </div>
    );
  }

  // Otherwise, try to load the image
  return (
    <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
      <Image
        src={getImageSrc()}
        alt={token.name}
        fill
        sizes={sizesProp[size]}
        className="object-contain"
        onError={handleImageError}
      />
    </div>
  );
};

export default TokenImage;
