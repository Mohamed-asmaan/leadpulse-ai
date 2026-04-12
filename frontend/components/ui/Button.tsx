import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants: Record<string, string> = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  outline: "border border-border bg-background shadow-sm hover:bg-accent/40 hover:text-accent-foreground",
  ghost: "hover:bg-accent/30 hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground shadow hover:bg-destructive/90",
};

const sizes: Record<string, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-6 text-sm",
  icon: "h-9 w-9 p-0 inline-flex items-center justify-center",
};

export function Button({
  variant = "default",
  size = "default",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children?: ReactNode;
}) {
  return (
    <button
      type={type}
      className={
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
        "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 " +
        `${variants[variant]} ${sizes[size]} ${className}`.trim()
      }
      {...props}
    >
      {children}
    </button>
  );
}
