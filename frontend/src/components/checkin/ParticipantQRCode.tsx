import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Download, Mail, Share2, Shield, CheckCircle } from "lucide-react";

interface ParticipantQRCodeProps {
  registrationId: string;
  eventTitle: string;
  participantName: string;
  participantEmail: string;
  qrCode: string;
  eventLocation?: string;
  eventDate?: string;
  eventTime?: string;
}

export function ParticipantQRCode({
  eventTitle,
  participantName,
  participantEmail,
  qrCode,
  eventLocation,
  eventDate,
  eventTime,
}: ParticipantQRCodeProps) {
  const [eventDetails, setEventDetails] = useState<any>(null);

  useEffect(() => {
    setEventDetails({
      title: eventTitle,
      date: eventDate || new Date().toLocaleDateString(),
      location: eventLocation || "Event Venue",
      time: eventTime || "10:00 AM",
    });
  }, [eventTitle, eventLocation, eventDate, eventTime]);

  const downloadQRCode = () => {
    const svg = document.querySelector(
      ".participant-qr-code svg"
    ) as SVGElement;
    if (!svg) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      canvas.width = 300;
      canvas.height = 400;
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, 300, 400);
          ctx.drawImage(img, 50, 50, 200, 200);
          ctx.fillStyle = "black";
          ctx.font = "16px Arial";
          ctx.textAlign = "center";
          ctx.fillText(eventTitle, 150, 280);
          ctx.font = "14px Arial";
          ctx.fillText(participantName, 150, 300);
          ctx.font = "12px Arial";
          ctx.fillText("Show this QR code at check-in", 150, 330);
        }
        const link = document.createElement("a");
        link.download = `${participantName.replace(/\s+/g, "-")}-ticket.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (error) {
      console.error("Error downloading QR code:", error);
      alert("Failed to download QR code. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h2 className="text-xl font-bold text-center">Event Ticket</h2>
        <p className="text-center text-blue-100 mt-1">
          {eventDetails?.title || eventTitle}
        </p>
      </div>
      <div className="p-6">
        {eventDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {participantName}
              </h3>
              <p className="text-gray-600">{participantEmail}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-medium">{eventDetails.date}</p>
              </div>
              <div>
                <p className="text-gray-600">Time</p>
                <p className="font-medium">{eventDetails.time}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Location</p>
                <p className="font-medium">{eventDetails.location}</p>
              </div>
            </div>
          </div>
        )}
        <div className="participant-qr-code bg-white p-6 rounded-xl border-2 border-gray-200 mb-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2 mb-3 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <Shield className="h-3 w-3" />
              <span>Secure Ticket</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <QRCode
                value={qrCode}
                size={220}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={downloadQRCode}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download Ticket</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Ticket for ${eventTitle}`,
                    text: `Here's my ticket for ${eventTitle}`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Ticket link copied to clipboard!");
                }
              }}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            <button
              onClick={() => {
                const subject = encodeURIComponent(`Ticket for ${eventTitle}`);
                const body = encodeURIComponent(
                  `Hi,\n\nHere's my ticket for ${eventTitle}.\n\nEvent Details:\n- Name: ${participantName}\n- Email: ${participantEmail}\n- QR Code: ${qrCode}\n\nSee you at the event!`
                );
                window.open(`mailto:?subject=${subject}&body=${body}`);
              }}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </button>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Ticket Validated
              </span>
            </div>
            <span className="text-xs text-green-600">Ready for check-in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
