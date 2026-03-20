"use client";
import React from "react";
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
} from "react-icons/fa";
import CounselorModal from "../components/CounselorModal";
import TrialModal from "../components/TrialModal";

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
      details: [{ label: "", value: "contact@rayofhopebihar.org" }],
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
      type: "modal",
      formId: "Connect-With-Counselor",
    },
    {
      icon: FaCalendarAlt,
      title: "Book Trial Session",
      description: "Experience our teaching methodology with a free trial",
      color: "bg-green-500",
      type: "modal",
      formId: "book-trial-session",
    },
    {
      icon: FaChalkboardTeacher,
      title: "Explore our courses",
      description: "NEET, JEE, SAT, AP, IB, CBSE",
      color: "bg-purple-500",
      type: "explore",
      items: [
        { name: "NEET", url: "https://www.testprepkart.com/neet" },
        { name: "JEE", url: "https://www.testprepkart.com/jee" },
        { name: "SAT", url: "https://www.testprepkart.com/sat" },
        { name: "AP", url: "https://www.testprepkart.com/ap" },
        { name: "IB", url: "https://www.testprepkart.com/ib" },
        { name: "CBSE", url: "https://www.testprepkart.com/cbse" },
      ],
    },
  ];

  const [modalState, setModalState] = React.useState({
    isCounselorOpen: false,
    isTrialOpen: false,
  });

  const handleInquiryClick = (item) => {
    if (item.formId === "Connect-With-Counselor") {
      setModalState((prev) => ({ ...prev, isCounselorOpen: true }));
    } else if (item.formId === "book-trial-session") {
      setModalState((prev) => ({ ...prev, isTrialOpen: true }));
    }
  };

  const closeCounselorModal = () => {
    setModalState((prev) => ({ ...prev, isCounselorOpen: false }));
  };

  const closeTrialModal = () => {
    setModalState((prev) => ({ ...prev, isTrialOpen: false }));
  };



  const officeHours = [
    { day: "Monday - Friday", time: "9:00 AM - 6:00 PM IST" },
    { day: "Saturday", time: "10:00 AM - 4:00 PM IST" },
    { day: "Sunday", time: "Closed" },
  ];



  return (
    <div className="space-y-8 py-6">
      {/* Hero Section */}
      <section className="hero-section bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 lg:p-10 border border-purple-100" aria-labelledby="contact-title">
        <div className="text-center max-w-3xl mx-auto">
          <h1 id="contact-title" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
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
                onClick={() => handleInquiryClick(item)}
                className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all border-l-4 ${item.color.replace('bg-', 'border-')} ${item.type === "modal" ? "cursor-pointer" : ""
                  } group`}
              >
                <div
                  className={`${item.color} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}
                >
                  <Icon className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                {item.type === "explore" ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.items.map((course, idx) => (
                      <a
                        key={idx}
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-md hover:bg-purple-100 transition-colors uppercase"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {course.name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">{item.description}</p>
                )}
              </div>
            );
          })}
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
            {/* Facebook */}
            <a
              href="https://www.facebook.com/testprepkart"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              aria-label="Facebook"
            >
              <FaFacebook className="text-xl" />
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/testprepkartonline"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg"
              aria-label="Instagram"
            >
              <FaInstagram className="text-xl" />
            </a>

            {/* Twitter / X */}
            <a
              href="https://twitter.com/testprepkart"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-blue-400 text-white rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors shadow-md hover:shadow-lg"
              aria-label="Twitter"
            >
              <FaTwitter className="text-xl" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/testprepkart"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-blue-700 text-white rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg"
              aria-label="LinkedIn"
            >
              <FaLinkedin className="text-xl" />
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@Testprepkart"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
              aria-label="YouTube"
            >
              <FaYoutube className="text-xl" />
            </a>

            {/* WhatsApp (optional – remove if not needed) */}
            <a
              href="https://api.whatsapp.com/send?phone=15107069331"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-md hover:shadow-lg"
              aria-label="WhatsApp"
            >
              <FaWhatsapp className="text-xl" />
            </a>
          </div>
        </div>
      </section>

      {/* Lead Form Modals */}
      <CounselorModal
        isOpen={modalState.isCounselorOpen}
        onClose={closeCounselorModal}
      />
      <TrialModal
        isOpen={modalState.isTrialOpen}
        onClose={closeTrialModal}
      />
    </div>
  );
};

export default ContactPage;
