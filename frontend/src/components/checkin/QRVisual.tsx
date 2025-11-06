import React from "react";
import QRCode from "react-qr-code";

interface QRVisualProps {
  value: string;
  size?: number;
  label?: string;
  footer?: string;
  className?: string;
}

export const QRVisual: React.FC<QRVisualProps> = ({
  value,
  size = 180,
  label,
  footer,
  className = "",
}) => {
  const trimmed = value?.toString().trim();
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && (
        <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">
          {label}
        </h2>
      )}
      <div className="bg-white p-3 rounded-lg border border-gray-100">
        {trimmed ? (
          <QRCode
            value={trimmed}
            size={size}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          />
        ) : (
          <div className="h-[${size}px] w-[${size}px] flex items-center justify-center text-xs text-red-500">
            Invalid QR
          </div>
        )}
      </div>
      {footer && (
        <p className="mt-2 text-[11px] text-gray-500 text-center">{footer}</p>
      )}
    </div>
  );
};

export default QRVisual;
