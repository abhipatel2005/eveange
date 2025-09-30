import { useState } from "react";
import { X, Copy, ExternalLink, Check, Share2, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import type { RegistrationForm } from "../../api/registrationForms";

interface ShareFormModalProps {
  form: RegistrationForm;
  eventId: string;
  onClose: () => void;
}

export function ShareFormModal({
  form,
  eventId,
  onClose,
}: ShareFormModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Generate URLs (these would be actual URLs in production)
  const baseUrl = window.location.origin;
  const registrationUrl = `${baseUrl}/events/${eventId}/register`;
  const embeddedUrl = `${baseUrl}/events/${eventId}/register?embed=true`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generateEmbedCode = () => {
    return `<iframe 
  src="${embeddedUrl}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border: none; border-radius: 8px;">
</iframe>`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Share2 className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Share Registration Form
                </h2>
                <p className="text-sm text-gray-600">{form.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Direct Link */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Registration Link
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={registrationUrl}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
              <button
                onClick={() => copyToClipboard(registrationUrl, "url")}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
              >
                {copied === "url" ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Preview</span>
              </a>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Share this link with participants to register for your event
            </p>
          </div>

          {/* QR Code Section */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              QR Code
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-md">
                    <QrCode className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      QR Code for Easy Access
                    </p>
                    <p className="text-sm text-gray-600">
                      Let participants scan to register quickly
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  {showQRCode ? "Hide QR Code" : "Generate QR Code"}
                </button>
              </div>

              {showQRCode && (
                <div className="border-t border-gray-200 p-6 bg-white">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="qr-code-container bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <QRCode
                        value={registrationUrl}
                        size={200}
                        style={{
                          height: "auto",
                          maxWidth: "100%",
                          width: "100%",
                        }}
                        viewBox={`0 0 200 200`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Scan to Register
                      </p>
                      <p className="text-xs text-gray-600 max-w-sm mx-auto">
                        Point your camera at this QR code to quickly access the
                        registration form
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // Download QR code as image
                          const qrContainer =
                            document.querySelector(".qr-code-container");
                          const svg = qrContainer?.querySelector(
                            "svg"
                          ) as SVGElement;

                          if (svg) {
                            try {
                              const svgData =
                                new XMLSerializer().serializeToString(svg);
                              const canvas = document.createElement("canvas");
                              const ctx = canvas.getContext("2d");
                              const img = new Image();

                              canvas.width = 200;
                              canvas.height = 200;

                              img.onload = () => {
                                if (ctx) {
                                  // Set white background
                                  ctx.fillStyle = "white";
                                  ctx.fillRect(0, 0, 200, 200);
                                  ctx.drawImage(img, 0, 0);
                                }
                                const link = document.createElement("a");
                                link.download = `${form.title.replace(
                                  /\s+/g,
                                  "-"
                                )}-qr-code.png`;
                                link.href = canvas.toDataURL("image/png");
                                link.click();
                              };

                              img.src =
                                "data:image/svg+xml;base64," + btoa(svgData);
                            } catch (error) {
                              console.error(
                                "Error downloading QR code:",
                                error
                              );
                              alert(
                                "Failed to download QR code. Please try again."
                              );
                            }
                          } else {
                            alert(
                              "QR code not found. Please generate the QR code first."
                            );
                          }
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Download QR Code
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(registrationUrl, "qr-url")
                        }
                        className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center space-x-1"
                      >
                        {copied === "qr-url" ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Embed Code */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Embed Code
            </label>
            <div className="space-y-3">
              <textarea
                value={generateEmbedCode()}
                readOnly
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700 font-mono"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Embed this form directly on your website
                </p>
                <button
                  onClick={() => copyToClipboard(generateEmbedCode(), "embed")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
                >
                  {copied === "embed" ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Form Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Form Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Registrations</p>
                <p className="font-semibold text-gray-900">0</p>
              </div>
              <div>
                <p className="text-gray-600">Form Views</p>
                <p className="font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
