import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  QrCode,
  Award,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const HomePage: React.FC = () => {
  const features = [
    {
      icon: Calendar,
      title: "Easy Event Creation",
      description:
        "Create and manage events with our intuitive event creation wizard.",
    },
    {
      icon: Users,
      title: "Flexible Registration",
      description:
        "Build custom registration forms with drag-and-drop form builder.",
    },
    {
      icon: QrCode,
      title: "QR Code Attendance",
      description:
        "Track attendance with QR code scanning for seamless check-ins.",
    },
    {
      icon: Award,
      title: "Digital Certificates",
      description:
        "Generate and distribute certificates automatically to attendees.",
    },
  ];

  const benefits = [
    "Create unlimited events",
    "Custom registration forms",
    "Real-time attendance tracking",
    "Automated certificate generation",
    "Payment integration",
    "Analytics dashboard",
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Manage Events Like a Pro
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              Complete event management platform with registration, attendance
              tracking, and certificate generation - all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/events"
                className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center"
              >
                Browse Events
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/register"
                className="border border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to manage events
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From creation to certification, we've got every aspect of event
              management covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="bg-primary-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why choose EventPro?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our platform is designed to streamline every aspect of event
                management, from initial planning to post-event certificate
                distribution.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to get started?
              </h3>
              <p className="text-gray-600 mb-6">
                Join thousands of event organizers who trust EventPro to manage
                their events.
              </p>
              <Link
                to="/register"
                className="btn-primary w-full text-center block"
              >
                Start Your Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to revolutionize your event management?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Start managing your events professionally with our comprehensive
            platform.
          </p>
          <Link
            to="/register"
            className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
