import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanningActive = useRef(true);

  useEffect(() => {
    scanningActive.current = isScanning;

    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      scanningActive.current = false;
      stopScanning();
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera
        },
      });

      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize QR code reader
      codeReader.current = new BrowserMultiFormatReader();

      if (videoRef.current) {
        codeReader.current.decodeFromVideoDevice(
          null,
          videoRef.current,
          async (result, error) => {
            // Don't process if scanning is no longer active
            if (!scanningActive.current) {
              return;
            }

            if (result && !scanning) {
              setScanning(true);
              const qrCode = result.getText();

              try {
                await handleScan(qrCode);
              } catch (err) {
                console.error("Scan error:", err);
                setLastScanResult({
                  type: "error",
                  message: "Failed to process scan",
                });
              } finally {
                // Allow next scan after 2 seconds
                setTimeout(() => {
                  setScanning(false);
                }, 2000);
              }
            }

            if (error && scanningActive.current) {
              // Handle different types of errors
              if (error.name === "NotFoundException") {
                // This is normal - just means no QR code detected in frame
                // Don't log this error to avoid spam
                return;
              }

              // Handle serious errors
              if (error.name === "NotAllowedError") {
                setLastScanResult({
                  type: "error",
                  message: "Camera permission denied",
                });
                setIsScanning(false); // Stop scanning on permission error
              } else if (error.name === "NotFoundError") {
                setLastScanResult({
                  type: "error",
                  message: "No camera found",
                });
                setIsScanning(false); // Stop scanning if no camera
              } else if (error.name !== "ChecksumException") {
                // Log other unexpected errors (but limit frequency)
                console.error("QR Scanner error:", error.name, error.message);
              }
            }
          }
        );
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setHasPermission(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleScan = async (qrCode: string) => {
    try {
      await onScan(qrCode);
      // Success feedback will be handled by parent component
    } catch (error: any) {
      if (error.message?.includes("already checked in")) {
        setLastScanResult({
          type: "duplicate",
          message: "Participant already checked in",
        });
      } else {
        setLastScanResult({
          type: "error",
          message: error.message || "Invalid QR code",
        });
      }
    }
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
    setLastScanResult(null);
  };

  if (hasPermission === false) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <CameraOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Camera Permission Required
          </h3>
          <p className="text-gray-600 mb-4">
            Please allow camera access to scan QR codes for check-in.
          </p>
          <button
            onClick={() => setHasPermission(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">QR Code Scanner</h3>
          <button
            onClick={toggleScanning}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${
              isScanning
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {isScanning ? (
              <>
                <CameraOff className="h-4 w-4" />
                <span>Stop Scanning</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                <span>Start Scanning</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video/Scanner Area */}
      <div className="relative">
        {isScanning ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover bg-black"
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed rounded-lg w-48 h-48 flex items-center justify-center">
                <div className="text-white text-sm font-medium">
                  Point camera at QR code
                </div>
              </div>
            </div>

            {/* Scanning status */}
            {scanning && (
              <div className="absolute top-4 left-4 right-4">
                <div className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm">
                  Processing scan...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click "Start Scanning" to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Scan Result Feedback */}
      {lastScanResult && (
        <div className="p-4 border-t border-gray-200">
          <div
            className={`flex items-center space-x-3 p-3 rounded-md ${
              lastScanResult.type === "success"
                ? "bg-green-50 text-green-800"
                : lastScanResult.type === "duplicate"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {lastScanResult.type === "success" && (
              <CheckCircle className="h-5 w-5" />
            )}
            {lastScanResult.type === "duplicate" && (
              <AlertCircle className="h-5 w-5" />
            )}
            {lastScanResult.type === "error" && <XCircle className="h-5 w-5" />}
            <div>
              <p className="font-medium">{lastScanResult.message}</p>
              {lastScanResult.participantName && (
                <p className="text-sm opacity-75">
                  Participant: {lastScanResult.participantName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Instructions:
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Point the camera at the participant's QR code</li>
          <li>• Ensure good lighting for better scanning</li>
          <li>• Hold steady until the scan completes</li>
          <li>• Each participant can only be checked in once</li>
        </ul>
      </div>
    </div>
  );
}
