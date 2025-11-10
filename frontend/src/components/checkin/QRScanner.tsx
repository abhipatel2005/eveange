import { useState, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Loader } from "../common/Loader";

interface QRScannerProps {
  onScan: (result: string) => Promise<void>;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  eventId: string;
}

interface ScanResult {
  type: "success" | "error" | "duplicate";
  message: string;
  participantName?: string;
}

export function QRScanner({
  onScan,
  isScanning,
  setIsScanning,
}: QRScannerProps) {
  console.log(" QRScanner component rendered, onScan:", typeof onScan);

  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  // const [scanCount, setScanCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const lastScanTime = useRef<number>(0);

  // Simple scan handler - just extract QR result and verify
  const handleScan = (result: any) => {
    console.log("🎯 Raw scan result:", result);

    // Extract the QR code value from different possible result formats
    let qrCode = "";
    if (Array.isArray(result) && result.length > 0) {
      // Handle array format from @yudiel/react-qr-scanner
      qrCode = result[0]?.rawValue || result[0]?.text || result[0];
    } else if (typeof result === "string") {
      // Handle direct string result
      qrCode = result;
    } else if (result?.rawValue) {
      // Handle object with rawValue property
      qrCode = result.rawValue;
    } else if (result?.text) {
      // Handle object with text property
      qrCode = result.text;
    }

    console.log("🎯 Extracted QR Code:", qrCode);

    if (!qrCode) {
      console.warn("⚠️ No QR code found in result:", result);
      return;
    }

    // Very minimal debouncing for continuous scanning
    const currentTime = Date.now();
    if (currentTime - lastScanTime.current < 100) {
      console.log("🚫 Ignoring rapid scan - too fast");
      return;
    }

    // Allow same QR code to be scanned again after processing is complete
    // Only prevent if currently processing the same code
    if (qrCode === lastScannedCode && scanning) {
      console.log("🚫 Still processing this QR code:", qrCode);
      return;
    }

    // Update scan tracking
    // lastScanTime.current = currentTime;
    setLastScannedCode(qrCode);
    // setScanCount((prev) => prev + 1);

    // Immediately restart scanner - processing can happen in background
    setTimeout(() => {
      console.log("🔄 Immediate scanner restart after QR detection");
      setIsScanning(false);
      setTimeout(() => {
        setIsScanning(true);
        setCameraError(null);
        console.log("✅ Scanner restarted immediately");
      }, 100);
    }, 500); // Quick restart after showing QR is detected

    // Call the verification function
    verifyAndProcessScan(qrCode);
  };

  // Handle timing for different result types - only clears feedback overlay
  const handleResultTiming = (result: ScanResult) => {
    // Determine display time based on result type - Google Pay style timing
    const totalDisplayTime =
      result.type === "success"
        ? 1800 // 1.8s for success (like Google Pay payment confirmation)
        : 2000; // 2s for errors/duplicates (need more time to read)

    // Just clear the feedback overlay - scanner restart is handled separately
    setTimeout(() => {
      setLastScanResult(null); // Clear the result message
      console.log("✅ Feedback overlay cleared");
    }, totalDisplayTime);
  }; // Separate verification function to handle the complex logic
  const verifyAndProcessScan = async (qrCode: string) => {
    setScanning(true);
    setLastScanResult(null);

    console.log("🚀 Starting verification for QR code:", qrCode);

    try {
      console.log("🔧 Calling onScan function...");
      const result = await onScan(qrCode);
      console.log("✅ QR scan processing completed successfully", result);

      // Extract participant name from result if available
      const participantName =
        (result as any)?.participant?.name || (result as any)?.name;

      const successResult = {
        type: "success" as const,
        message: "✅ Check-in successful!",
        participantName: participantName,
      };
      setLastScanResult(successResult);

      // Handle success timing
      handleResultTiming(successResult);
      return;
    } catch (error: any) {
      console.error("❌ Error in verification:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Full error object:", error);

      // Log detailed error information for debugging
      if (error.status) {
        console.error("❌ HTTP Status:", error.status);
      }

      // Handle specific error cases with better messages
      let errorMessage = "❌ Check-in failed - Please try again";
      let errorType: "error" | "duplicate" = "error";

      if (error.message?.includes("already checked in")) {
        errorMessage = "⚠️ Participant already checked in";
        errorType = "duplicate";
      } else if (error.message?.includes("Registration not found")) {
        errorMessage =
          "❌ Invalid QR code - This registration was not found for this event";
      } else if (error.message?.includes("not found")) {
        errorMessage = "❌ Registration not found - Please check the QR code";
      } else if (error.message?.includes("Authentication")) {
        errorMessage =
          "🔐 Authentication error - Please refresh and login again";
      } else if (error.message?.includes("401")) {
        errorMessage = "🔐 Session expired - Please refresh and login again";
      } else if (
        error.message?.includes("403") ||
        error.message?.includes("Access denied")
      ) {
        errorMessage = "🚫 Access denied - You don't have check-in permissions";
      } else if (error.message?.includes("different event")) {
        errorMessage = "🎫 Wrong event - This QR code is for a different event";
      } else if (error.message) {
        errorMessage = error.message; // Use the actual error message from backend
      }

      const errorResult = {
        type: errorType,
        message: errorMessage,
      };
      setLastScanResult(errorResult);

      // Handle error timing
      handleResultTiming(errorResult);
    } finally {
      // Always stop scanning state
      setScanning(false);
    }
  };

  const startScanning = () => {
    console.log(" Starting QR scanner...");
    setIsScanning(true);
    setCameraError(null);
    setLastScanResult(null);
  };

  const stopScanning = () => {
    console.log(" Stopping QR scanner...");
    setIsScanning(false);
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            QR Code Scanner
          </h3>
          <div className="flex items-center gap-2">
            {/* <span className="text-sm text-gray-500 dark:text-gray-400">
              Scans: {scanCount}
            </span> */}
            {isScanning ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <CameraOff className="w-4 h-4" />
                <span className="text-sm font-medium">Inactive</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scanner-controls mb-4">
        <div className="flex gap-2">
          {!isScanning ? (
            <button
              onClick={startScanning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <CameraOff className="w-4 h-4" />
              Stop Scanner
            </button>
          )}
        </div>
      </div>

      <div className="scanner-display">
        {isScanning ? (
          <div className="scanner-viewport relative">
            <Scanner
              onScan={handleScan}
              onError={(error) => {
                console.error("❌ QR Scanner error:", error);
                // Only set camera error for actual camera issues, not audio CSP issues
                const errorMessage =
                  typeof error === "string"
                    ? error
                    : error?.toString() || "Camera access failed";
                if (
                  !errorMessage.includes("media-src") &&
                  !errorMessage.includes("audio")
                ) {
                  setCameraError(errorMessage);
                }
              }}
              scanDelay={2000}
              allowMultiple={false}
              constraints={{
                facingMode: "environment", // Use back camera
                width: { ideal: 640 },
                height: { ideal: 480 },
              }}
              styles={{
                container: {
                  width: "100%",
                  maxWidth: "400px",
                  height: "300px",
                  margin: "0 auto",
                  border: "2px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                },
                video: {
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                },
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center">
                <div className="text-blue-500 text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Scan QR Code</p>
                </div>
              </div>
            </div>
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center z-50 bg-white dark:bg-gray-900">
                <div className="relative">
                  {/* Processing Icon Circle */}
                  <div className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl bg-blue-500">
                    <Loader size="xl" className="border-white" />
                  </div>

                  {/* Processing Message Below */}
                  <div className="mt-4 text-center">
                    <div className="px-4 py-2 rounded-lg text-sm font-medium shadow-lg bg-blue-600 text-white">
                      Processing QR code...
                    </div>
                  </div>
                </div>
              </div>
            )}
            {lastScanResult && !scanning && (
              <div className="absolute inset-0 flex items-center justify-center z-50 bg-white dark:bg-gray-900">
                <div className="relative">
                  {/* Main Icon Circle */}
                  <div
                    className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl ${
                      lastScanResult.type === "success"
                        ? "bg-green-500"
                        : lastScanResult.type === "duplicate"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  >
                    {lastScanResult.type === "success" ? (
                      <CheckCircle className="w-16 h-16 text-white" />
                    ) : lastScanResult.type === "duplicate" ? (
                      <AlertCircle className="w-16 h-16 text-white" />
                    ) : (
                      <XCircle className="w-16 h-16 text-white" />
                    )}
                  </div>

                  {/* Message Below */}
                  <div className="mt-4 text-center">
                    <div
                      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
                        lastScanResult.type === "success"
                          ? "bg-green-600 text-white"
                          : lastScanResult.type === "duplicate"
                          ? "bg-yellow-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {lastScanResult.message}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="scanner-placeholder flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <CameraOff className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Scanner Inactive</p>
              <p className="text-sm">
                Click "Start Scanner" to begin scanning QR codes
              </p>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Camera Error</span>
          </div>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {cameraError}
          </p>
        </div>
      )}

      {/* {lastScanResult && (
        <div
          className={`mt-4 p-4 rounded-lg border ${
            lastScanResult.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : lastScanResult.type === "duplicate"
              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {lastScanResult.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : lastScanResult.type === "duplicate" ? (
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span
              className={`font-medium ${
                lastScanResult.type === "success"
                  ? "text-green-700 dark:text-green-300"
                  : lastScanResult.type === "duplicate"
                  ? "text-yellow-700 dark:text-yellow-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {lastScanResult.message}
            </span>
          </div>
          {isPreparingNext ? (
            <div className="mt-3">
              <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Loader size="xs" />
                <span>Preparing for next scan</span>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Scanner is ready for next QR code...
              </div>
            </div>
          )}
        </div>
      )} */}

      {/* {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border text-xs text-gray-600 dark:text-gray-400">
          <div className="font-medium mb-2">Debug Info:</div>
          <div>Component Active: | onScan: {typeof onScan}</div>
          <div>Last Scanned: {lastScannedCode || "None"}</div>
          <div>Scanning State: {scanning ? "Processing" : "Ready"}</div>
          <div>Scanner Active: {isScanning ? "Yes" : "No"}</div>
        </div>
      )} */}
    </div>
  );
}
