import { useEffect, useRef, useState, useCallback } from "react";
import {
  Html5QrcodeScanner,
  Html5QrcodeResult,
  QrcodeErrorCallback,
} from "html5-qrcode";
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import "./qr-scanner.css";

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementId = "qr-scanner-container";

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [scanCount, setScanCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Debounce timer for preventing rapid scans
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastScanTime = useRef<number>(0);

  // Advanced scanner configuration for optimal performance
  const config = {
    fps: 10, // Optimal frame rate for performance
    qrbox: { width: 250, height: 250 }, // Scan area
    aspectRatio: 1.0,
    disableFlip: false,
    videoConstraints: {
      facingMode: "environment", // Prefer back camera
    },
    rememberLastUsedCamera: true,
    showTorchButtonIfSupported: true,
    showZoomSliderIfSupported: true,
    defaultZoomValueIfSupported: 1,
    useBarCodeDetectorIfSupported: true, // Use native barcode detection if available
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
  };

  // Handle successful QR code detection
  const onScanSuccess = useCallback(
    async (decodedText: string, _decodedResult: Html5QrcodeResult) => {
      const currentTime = Date.now();

      // Prevent rapid successive scans (minimum 2 seconds between scans)
      if (currentTime - lastScanTime.current < 2000) {
        // if (import.meta.env.DEV) {
        //   console.log("Ignoring rapid scan");
        // }
        return;
      }

      // Prevent duplicate scans of the same QR code
      if (decodedText === lastScannedCode || scanning) {
        // if (import.meta.env.DEV) {
        //   console.log("Ignoring duplicate scan:", decodedText);
        // }
        return;
      }

      lastScanTime.current = currentTime;
      setScanning(true);
      setLastScannedCode(decodedText);
      setScanCount((prev) => prev + 1);
      setLastScanResult(null);

      // Only log QR data in development
      if (import.meta.env.DEV) {
        // console.log("QR Code detected:", decodedText);
        // console.log("Scan result details:", decodedResult);
      }

      // Clear any existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      try {
        // Process the QR code
        await handleScan(decodedText);

        // Success feedback
        setLastScanResult({
          type: "success",
          message: "QR code scanned successfully! Processing check-in...",
        });
      } catch (error: any) {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.error("Scan processing error:", error);
        }

        // Error feedback
        if (error.message?.includes("already checked in")) {
          setLastScanResult({
            type: "duplicate",
            message: "Participant already checked in",
          });
        } else {
          setLastScanResult({
            type: "error",
            message: error.message || "Invalid QR code or processing error",
          });
        }
      } finally {
        // Reset scanning state after processing
        debounceTimer.current = setTimeout(() => {
          setScanning(false);
          // Clear the duplicate prevention after 5 seconds
          setTimeout(() => {
            setLastScannedCode("");
          }, 5000);
        }, 2000);
      }
    },
    [scanning, lastScannedCode, onScan]
  );

  // Handle scan errors (this will be called frequently, so we keep it minimal)
  const onScanError: QrcodeErrorCallback = useCallback(
    (errorMessage: string) => {
      // Only log significant errors in development, not the constant "No QR code found" messages
      if (
        import.meta.env.DEV &&
        !errorMessage.includes("NotFoundException") &&
        !errorMessage.includes("No MultiFormat Readers were able")
      ) {
        console.warn("QR Scan error:", errorMessage);
      }
    },
    []
  );

  // Process the scanned QR code
  const handleScan = async (qrCode: string) => {
    try {
      await onScan(qrCode);
      setLastScanResult({
        type: "success",
        message: "Participant checked in successfully!",
      });
    } catch (error: any) {
      throw error; // Re-throw to be handled by onScanSuccess
    }
  };

  // Check camera permissions first
  const checkCameraPermissions = async () => {
    try {
      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach((track) => track.stop());

      // if (import.meta.env.DEV) {
      //   console.log("Camera permission granted");
      // }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Camera permission denied or not available:", error);
      }
      return false;
    }
  };

  // Initialize the scanner
  const initializeScanner = useCallback(async () => {
    try {
      if (import.meta.env.DEV) {
        // console.log("Initializing HTML5 QR Code Scanner...");
      }
      setHasPermission(null); // Set loading state

      // Check camera permissions first
      const hasPermissions = await checkCameraPermissions();
      if (!hasPermissions) {
        setHasPermission(false);
        setLastScanResult({
          type: "error",
          message:
            "Camera access denied. Please allow camera permissions and try again.",
        });
        return;
      }

      // Clean up existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn("Error clearing previous scanner:", e);
          }
        }
        scannerRef.current = null;
      }

      // Small delay to ensure DOM element is ready
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify the scanner element exists
      const scannerElement = document.getElementById(scannerElementId);
      if (!scannerElement) {
        if (import.meta.env.DEV) {
          console.error("Scanner element not found");
        }
        setHasPermission(false);
        return;
      }

      // Create new scanner instance
      scannerRef.current = new Html5QrcodeScanner(
        scannerElementId,
        config,
        false // verbose logging - set to true for debugging
      );

      // Render the scanner
      await scannerRef.current.render(onScanSuccess, onScanError);

      setIsInitialized(true);
      setHasPermission(true);
      // if (import.meta.env.DEV) {
      //   console.log("QR Scanner initialized successfully");
      // }
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      if (import.meta.env.DEV) {
        console.error("Failed to initialize scanner:", error);
      }
      setHasPermission(false);
      setLastScanResult({
        type: "error",
        message: `Failed to initialize camera: ${errorMessage}. Please check permissions and try again.`,
      });
    }
  }, [onScanSuccess, onScanError]);

  // Start scanning
  const startScanning = useCallback(() => {
    if (!isInitialized) {
      initializeScanner();
    }
  }, [isInitialized, initializeScanner]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.pause(true);
    }
  }, []);

  // Handle scanning state changes
  useEffect(() => {
    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  // Initialize scanner on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (isScanning) {
        initializeScanner();
      }
    }, 100);

    return () => {
      clearTimeout(timer);

      // Cleanup scanner
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }

      // Clear timers
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Toggle scanning
  const toggleScanning = () => {
    setIsScanning(!isScanning);
    setLastScanResult(null);
    setScanning(false);
    setLastScannedCode("");

    // Clear any pending timers
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };

  // Retry initialization
  const retryInitialization = () => {
    setHasPermission(null);
    setLastScanResult(null);
    setIsInitialized(false);

    setTimeout(() => {
      initializeScanner();
    }, 500);
  };

  // Permission denied state
  if (hasPermission === false) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <CameraOff className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Camera Access Required
          </h3>
          <p className="text-gray-600 mb-4">
            QR code scanning requires camera access to function properly.
          </p>

          <div className="text-left text-sm text-gray-600 mb-4 space-y-1 bg-gray-50 p-3 rounded">
            <p className="font-medium">To enable camera access:</p>
            <p>• Click "Allow" when prompted for camera permission</p>
            <p>• Check your browser settings for camera permissions</p>
            <p>• Ensure no other app is using the camera</p>
            <p>• Make sure you're using HTTPS (required by most browsers)</p>
            <p>• Try refreshing the page if problems persist</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={retryInitialization}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (hasPermission === null) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Initializing Camera
          </h3>
          <p className="text-gray-600">
            Setting up QR code scanner... Please allow camera access when
            prompted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              QR Code Scanner
            </h3>
            <p className="text-sm text-gray-500">
              Scans: {scanCount} | High-Speed & Accurate
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Performance indicator */}
            <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Fast Mode
            </div>

            {/* Start/Stop Button */}
            <button
              onClick={toggleScanning}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                isScanning
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="h-4 w-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span>Start</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="relative">
        {isScanning ? (
          <div className="relative">
            {/* Scanner container - html5-qrcode will render here */}
            <div id={scannerElementId} className="w-full"></div>

            {/* Scanning overlay */}
            {scanning && (
              <div className="absolute top-4 left-4 right-4 z-10">
                <div className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Processing QR code...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Advanced QR Scanner Ready</p>
              <p className="text-sm text-gray-500">
                Click "Start" to begin high-speed scanning
              </p>
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

      {/* Instructions & Features */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>• High-speed scanning (10 FPS)</div>
          <div>• Auto-focus & exposure</div>
          <div>• Duplicate prevention</div>
          <div>• Torch/flashlight support</div>
          <div>• Multiple format support</div>
          <div>• Camera memory</div>
        </div>

        <h4 className="text-sm font-medium text-gray-900 mt-3 mb-2">Tips:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Hold device steady and ensure good lighting</li>
          <li>• QR code should fill the scan area (green box)</li>
          <li>• Use torch button for low-light conditions</li>
          <li>• Each QR code can only be scanned once per session</li>
        </ul>
      </div>
    </div>
  );
}
