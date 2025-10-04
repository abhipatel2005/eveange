import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        {
          "bg-blue-600 text-white hover:bg-blue-700": variant === "default",
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground":
            variant === "outline",
          "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
        },
        {
          "h-10 py-2 px-4": size === "default",
          "h-9 px-3": size === "sm",
          "h-11 px-8": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
