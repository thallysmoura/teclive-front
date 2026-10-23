import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "h-11 px-5 rounded-[10px] text-sm font-bold transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:bg-ds-border-subtle disabled:text-[#a9b6c2]";

const variants: Record<Variant, string> = {
  primary:
    "bg-ds-primary text-white shadow-[0_2px_8px_-2px_rgba(0,141,255,0.5)] hover:bg-ds-primary-hover hover:-translate-y-px",
  secondary:
    "bg-white text-ds-primary-deep border border-ds-border hover:border-ds-primary hover:text-ds-primary",
  ghost: "bg-transparent text-ds-text-muted hover:bg-ds-bg hover:text-ds-primary-hover",
  danger:
    "bg-ds-danger-bg text-ds-danger-text border border-ds-danger-border hover:bg-ds-danger hover:border-ds-danger hover:text-white",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ variant = "primary", className = "", ...props }, ref) => (
  <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />
));
Button.displayName = "Button";
