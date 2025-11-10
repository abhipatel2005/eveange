import { useState } from "react";
import {
  CertificateService,
  CertificateVerification,
} from "../api/certificates";
import {
  Award,
  Search,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  MapPin,
  User,
  Mail,
} from "lucide-react";
import { Loader } from "../components/common/Loader";

export default function CertificateVerificationPage() {
  const [certificateCode, setCertificateCode] = useState("");
  const [verification, setVerification] =
    useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!certificateCode.trim()) {
      setError("Please enter a certificate code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setVerification(null);

      const response = await CertificateService.verifyCertificate(
        certificateCode.trim()
      );

      if (response.success && response.data) {
        setVerification(response.data);
      } else {
        setError(response.error || "Certificate not found");
      }
    } catch (err) {
      console.error("Error verifying certificate:", err);
      setError("Failed to verify certificate");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (verification?.certificate) {
      const downloadUrl = CertificateService.downloadCertificate(
        verification.certificate.code
      );
      window.open(downloadUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Award className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Certificate Verification
          </h1>
          <p className="text-xl text-gray-600">
            Verify the authenticity of event participation certificates
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label
                htmlFor="certificate-code"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Certificate Code
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  id="certificate-code"
                  value={certificateCode}
                  onChange={(e) => setCertificateCode(e.target.value)}
                  placeholder="Enter certificate code (e.g., CERT-ABC12345)"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <Loader size="xs" className="border-white" />
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Verify
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>
                Enter the certificate code found on your participation
                certificate to verify its authenticity. Certificate codes are in
                the format: CERT-XXXXXXXX
              </p>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Verification Results */}
        {verification && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {verification.valid && verification.certificate ? (
              <>
                {/* Valid Certificate */}
                <div className="bg-green-50 border-b border-green-200 p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <h2 className="text-2xl font-bold text-green-900">
                        Certificate Verified ✓
                      </h2>
                      <p className="text-green-700">
                        This certificate is authentic and valid
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Participant Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                        Participant Information
                      </h3>

                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-semibold text-gray-900">
                            {verification.certificate.participantName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-semibold text-gray-900">
                            {verification.certificate.participantEmail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Award className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">
                            Certificate Code
                          </p>
                          <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                            {verification.certificate.code}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Event Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                        Event Information
                      </h3>

                      <div>
                        <p className="text-sm text-gray-500">Event Title</p>
                        <p className="font-semibold text-gray-900">
                          {verification.certificate.event.title}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Event Date</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(
                              verification.certificate.event.date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {verification.certificate.event.location && (
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-semibold text-gray-900">
                              {verification.certificate.event.location}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-gray-500">Issued Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(
                            verification.certificate.issuedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="mt-8 pt-6 border-t">
                    <button
                      onClick={handleDownload}
                      className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center mx-auto"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download Certificate
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Invalid Certificate */
              <div className="bg-red-50 p-6">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-500 mr-3" />
                  <div>
                    <h2 className="text-2xl font-bold text-red-900">
                      Certificate Not Found
                    </h2>
                    <p className="text-red-700">
                      The certificate code you entered is not valid or does not
                      exist in our system.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!verification && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How to Verify Your Certificate
            </h3>
            <ul className="text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </span>
                Locate your certificate code on your participation certificate
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </span>
                Enter the complete code in the field above (format:
                CERT-XXXXXXXX)
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </span>
                Click "Verify" to check the certificate's authenticity
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  4
                </span>
                Download the verified certificate if needed
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
