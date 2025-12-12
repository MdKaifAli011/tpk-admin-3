"use client";
import React from "react";
import MainLayout from "../layout/MainLayout";
import ContactForm from "../components/ContactForm";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaHeadset,
  FaQuestionCircle,
  FaCheckCircle,
  FaYoutube,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaWhatsapp,
  FaUserTie,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaGraduationCap,
  FaFlask,
  FaBook,
} from "react-icons/fa";

const ContactPage = () => {
  const contactInfo = [
    {
      icon: FaPhone,
      title: "Contact Phone Number",
      details: [
        { label: "Landline", value: "+91 0120 4525484" },
        { label: "Mobile", value: "+91 8800123492" },
      ],
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: FaEnvelope,
      title: "Our Email Address",
      details: [{ label: "", value: "info@testprepkart.com" }],
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: FaMapMarkerAlt,
      title: "Our Location",
      details: [
        {
          label: "",
          value: "F 377, Sector 63, Noida",
        },
        {
          label: "",
          value: "Uttar Pradesh, India (201301)",
        },
      ],
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: FaWhatsapp,
      title: "WhatsApp",
      details: [{ label: "Support", value: "+1 (510) 706-9331" }],
      color: "bg-green-50 text-green-600",
    },
  ];

  const coachingInquiry = [
    {
      icon: FaUserTie,
      title: "Connect With Counselor",
      description: "Get personalized guidance from our expert counselors",
      color: "bg-blue-500",
    },
    {
      icon: FaCalendarAlt,
      title: "Book Trial Session",
      description: "Experience our teaching methodology with a free trial",
      color: "bg-green-500",
    },
    {
      icon: FaChalkboardTeacher,
      title: "Schedule Demo Session",
      description: "See how our platform works with a live demonstration",
      color: "bg-purple-500",
    },
  ];

  const counselingHelp = [
    {
      icon: FaGraduationCap,
      title: "JEE Inquiry",
      description: "Get information about JEE preparation courses and counseling",
      color: "bg-indigo-500",
    },
    {
      icon: FaFlask,
      title: "NEET Inquiry",
      description: "Learn about NEET coaching programs and admission guidance",
      color: "bg-red-500",
    },
    {
      icon: FaBook,
      title: "SAT Inquiry",
      description: "Explore SAT preparation courses and study abroad options",
      color: "bg-yellow-500",
    },
  ];

  const officeHours = [
    { day: "Monday - Friday", time: "9:00 AM - 6:00 PM IST" },
    { day: "Saturday", time: "10:00 AM - 4:00 PM IST" },
    { day: "Sunday", time: "Closed" },
  ];

  const whyContactUs = [
    {
      icon: FaHeadset,
      title: "24/7 Support",
      description: "Get assistance anytime you need help with your preparation",
    },
    {
      icon: FaQuestionCircle,
      title: "Expert Guidance",
      description: "Connect with our experienced counselors for personalized advice",
    },
    {
      icon: FaCheckCircle,
      title: "Quick Response",
      description: "We respond to all inquiries within 24 hours",
    },
  ];

  const faqs = [
    {
      question: "How quickly will I receive a response?",
      answer:
        "We typically respond to all inquiries within 24 hours during business days.",
    },
    {
      question: "Can I schedule a one-on-one consultation?",
      answer:
        "Yes! Fill out the contact form and mention your preference for a consultation. Our team will get back to you to schedule a convenient time.",
    },
    {
      question: "What information should I include in my inquiry?",
      answer:
        "Please include your name, email, phone number, country, class/grade, and a brief description of how we can help you.",
    },
    {
      question: "Do you offer support for international students?",
      answer:
        "Absolutely! We support students from all over the world. Just select your country in the contact form.",
    },
  ];

  return (
    <MainLayout showSidebar={false}>
      <div className="space-y-8 py-6">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 lg:p-10 border border-purple-100">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Get In Touch With Us
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 leading-relaxed">
              Have questions? We're here to help! Reach out to our team and
              we'll get back to you as soon as possible.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Quick Response</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Expert Support</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>24/7 Available</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information Cards */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                >
                  <div className={`${info.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="text-xl" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                    {info.title}
                  </h3>
                  <div className="space-y-2">
                    {info.details.map((detail, idx) => (
                      <div key={idx}>
                        {detail.label && (
                          <p className="text-xs text-gray-500 mb-1">
                            {detail.label}
                          </p>
                        )}
                        <p className="text-sm font-medium text-gray-700">
                          {detail.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Office Hours */}
        <section className="bg-white rounded-xl p-6 md:p-8 shadow-md border border-gray-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
              <FaClock className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Office Hours
              </h2>
              <p className="text-gray-600">
                Our team is available during these hours to assist you
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {officeHours.map((schedule, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <span className="font-medium text-gray-900">
                  {schedule.day}
                </span>
                <span className="text-gray-600">{schedule.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Coaching Inquiry Section */}
        <section className="bg-white rounded-xl p-6 md:p-8 shadow-md border border-gray-100">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
            Coaching Inquiry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coachingInquiry.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div
                    className={`${item.color} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Counseling Help Section */}
        <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 md:p-8 border border-indigo-100">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
            Counseling Help
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {counselingHelp.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div
                    className={`${item.color} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Form Section */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Send Us a Message
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Fill out the form below and our team will get back to you within
              24 hours. We're here to help with any questions about our
              courses, admissions, or support services.
            </p>
          </div>
      <ContactForm />
        </section>

        {/* Why Contact Us */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 border border-blue-100">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
            Why Contact Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whyContactUs.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center"
                >
                  <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white rounded-xl p-6 md:p-8 shadow-md border border-gray-100">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-start gap-2">
                  <FaQuestionCircle className="text-blue-500 shrink-0 mt-1" />
                  {faq.question}
                </h3>
                <p className="text-gray-600 ml-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Media Section */}
        <section className="bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Follow Us on Social Media
            </h2>
            <p className="text-gray-600 mb-6">
              Stay connected with us for updates, tips, and educational content
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="#"
                className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                aria-label="Facebook"
              >
                <FaFacebook className="text-xl" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg"
                aria-label="Instagram"
              >
                <FaInstagram className="text-xl" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-blue-400 text-white rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors shadow-md hover:shadow-lg"
                aria-label="Twitter"
              >
                <FaTwitter className="text-xl" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-blue-700 text-white rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="text-xl" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                aria-label="YouTube"
              >
                <FaYoutube className="text-xl" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-md hover:shadow-lg"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="text-xl" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default ContactPage;
