import { Input } from "@/components/ui/Input";

interface BrandedNumericInputProps {
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function BrandedNumericInput({
  onChange,
  className,
  readOnly,
}: BrandedNumericInputProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        placeholder="0"
        className={`w-full h-12 text-3xl bg-zinc-800 border-none rounded-full focus:ring-0 focus:ring-offset-0 hover:bg-zinc-700 pl-4 ${className}`}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
        $0
      </div>
    </div>
  );
}
