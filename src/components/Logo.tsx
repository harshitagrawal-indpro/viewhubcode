
import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = true, 
  size = "md" 
}) => {
  const logoSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/lovable-uploads/73220fdc-fcdb-4b0a-a476-2af1916d222a.png" 
        alt="ViewHub Logo" 
        className={`${logoSizes[size]} object-contain`} 
      />
      {showText && (
        <span className={`ml-2 font-semibold ${size === "lg" ? "text-xl" : "text-lg"}`}>
          ViewHub
        </span>
      )}
    </div>
  );
};

export default Logo;
