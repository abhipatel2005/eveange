import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  QrCode,
  Award,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Zap,
  TrendingUp,
  Menu,
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
    <div className="bg-white min-h-screen">
      {/* Hero Section with Integrated Navbar */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
        {/* Navbar - Integrated into hero */}
        <nav className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              {/* Logo */}
              <Link
                to="/"
                className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text"
              >
                eveange
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link
                  to="/"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/events"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Events
                </Link>
                <a
                  href="#features"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Pricing
                </a>
              </div>

              {/* Auth Buttons */}
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button className="md:hidden p-2">
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          {/* New Feature Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>We've just released a new feature →</span>
            </div>
          </div>

          {/* Main Heading */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Boost Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Events
              </span>
              ,<br />
              Simplify Your Life
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              We're here to simplify the intricacies of your event management,
              providing a user-friendly platform that not only manages your
              events effortlessly but also enhances your overall efficiency.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/register"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center"
              >
                Get Started
              </Link>
              {/* <Link
                to="/events"
                className="border-2 border-indigo-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 font-semibold py-3 px-8 rounded-xl transition-all inline-flex items-center justify-center"
              >
                Preview Platform
              </Link> */}
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative max-w-5xl mx-auto">
            {/* Browser Chrome */}
            <div className="bg-white rounded-t-2xl shadow-2xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Event Card 1 - Purple */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="text-2xl font-bold">142</div>
                    </div>
                    <h3 className="font-semibold mb-1">Total Events</h3>
                    <p className="text-purple-100 text-sm">Active campaigns</p>
                  </div>

                  {/* Event Card 2 - Blue */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-2xl font-bold">2.4K</div>
                    </div>
                    <h3 className="font-semibold mb-1">Registrations</h3>
                    <p className="text-blue-100 text-sm">This month</p>
                  </div>

                  {/* Event Card 3 - Indigo */}
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="text-2xl font-bold">1.8K</div>
                    </div>
                    <h3 className="font-semibold mb-1">Certificates</h3>
                    <p className="text-indigo-100 text-sm">Generated</p>
                  </div>
                </div>

                {/* Today's Schedule Section */}
                <div className="mt-6 bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Today's Schedule
                    </h3>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="space-y-3">
                    {/* Schedule Item 1 */}
                    <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-shrink-0">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white"></div>
                          <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white"></div>
                          <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          Tech Conference 2024
                        </p>
                        <p className="text-xs text-gray-500">
                          10:00 AM - 2:00 PM
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white text-xs rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>Live</span>
                      </div>
                    </div>

                    {/* Schedule Item 2 */}
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-pink-500 border-2 border-white"></div>
                          <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          Workshop Series
                        </p>
                        <p className="text-xs text-gray-500">
                          3:00 PM - 5:00 PM
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">Upcoming</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div
            className="absolute bottom-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
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
                <div
                  key={index}
                  className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-purple-400 hover:shadow-xl transition-all duration-300"
                >
                  <div className="bg-gradient-to-br from-purple-100 to-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-purple-600" />
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
      <section
        id="pricing"
        className="py-20 bg-gradient-to-br from-purple-50 to-blue-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                <span>Why eveange?</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Everything you need.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                  Nothing you don't.
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our platform is designed to streamline every aspect of event
                management, from initial planning to post-event certificate
                distribution.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start group">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Popular Choice
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Ready to get started?
                </h3>
                <p className="text-gray-600 mb-6">
                  Join thousands of event organizers who trust eveange to manage
                  their events professionally.
                </p>
                <Link
                  to="/register"
                  className="btn bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white w-full text-center block py-4 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all"
                >
                  Start Your Free Trial
                </Link>
                <p className="text-center text-sm text-gray-500 mt-4">
                  No credit card required • Free forever plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 text-white py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to transform your event management?
          </h2>
          <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
            Start creating amazing events today with our comprehensive platform.
            No setup fees, no hidden costs.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-purple-600 hover:bg-gray-100 font-semibold py-4 px-10 rounded-xl transition-all shadow-xl transform hover:scale-105"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -mb-32 -ml-32"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -mt-32 -mr-32"></div>
      </section>
    </div>
  );
};

export default HomePage;
