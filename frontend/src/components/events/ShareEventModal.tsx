import { useState } from "react";
import {
  X,
  Copy,
  Check,
  Share2,
  QrCode,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
} from "lucide-react";
import QRCode from "react-qr-code";

interface ShareEventModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export function ShareEventModal({
  eventId,
  eventTitle,
  onClose,
}: ShareEventModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const baseUrl = window.location.origin;
  const eventUrl = `${baseUrl}/events/${eventId}`;
  const encodedUrl = encodeURIComponent(eventUrl);
  const encodedTitle = encodeURIComponent(eventTitle);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "bg-sky-500 hover:bg-sky-600",
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "bg-blue-700 hover:bg-blue-800",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-gray-600 hover:bg-gray-700",
      url: `mailto:?subject=${encodedTitle}&body=Check%20out%20this%20event:%20${encodedUrl}`,
    },
  ];

  const handleSocialShare = (url: string) => {
    window.open(url, "_blank", "width=600,height=400");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Share2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Share Event
                </h2>
                <p className="text-sm text-gray-600 truncate max-w-xs">
                  {eventTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Copy Link Section */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Event Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={eventUrl}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Media Share */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Share on Social Media
            </label>
            <div className="grid grid-cols-5 gap-3">
              {shareLinks.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleSocialShare(platform.url)}
                  className={`${platform.color} text-white p-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 group hover:scale-105`}
                  title={`Share on ${platform.name}`}
                >
                  <platform.icon className="h-5 w-5" />
                  <span className="text-xs hidden sm:block">
                    {platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-900">
                QR Code
              </label>
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <QrCode className="h-4 w-4" />
                {showQRCode ? "Hide" : "Show"} QR Code
              </button>
            </div>

            {showQRCode && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCode value={eventUrl} size={200} />
                </div>
                <p className="text-xs text-gray-600 mt-4 text-center">
                  Scan this QR code to open the event page
                </p>
              </div>
            )}
          </div>

          {/* Info Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">💡 Tip:</span> Share this link with
              anyone who might be interested in attending this event.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
