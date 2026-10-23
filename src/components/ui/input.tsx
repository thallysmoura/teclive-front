import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ className = "", error = false, ...props }, ref) => (
  <input
    ref={ref}
    className={`h-11 w-full rounded-[10px] border bg-white px-3.5 text-base text-ds-text outline-none transition-all duration-150 ease-out placeholder:text-ds-text-secondary sm:text-sm ${
      error
        ? "border-ds-danger focus:border-ds-danger focus:shadow-[0_0_0_3px_rgba(225,67,55,0.16)]"
        : "border-ds-border focus:border-ds-primary focus:shadow-[0_0_0_3px_rgba(0,141,255,0.16)]"
    } ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold uppercase tracking-wider text-ds-text-secondary">
      {children}
    </span>
  );
}
