import { countryCodeMap } from "../constants/formConstants";

// Country-specific phone number validation patterns
const phonePatterns = {
  India: {
    pattern: /^[6-9]\d{9}$/,
    message: "Indian mobile number must be 10 digits starting with 6-9",
  },
  "United States": {
    pattern: /^\d{10}$/,
    message: "US phone number must be 10 digits",
  },
  Canada: {
    pattern: /^\d{10}$/,
    message: "Canadian phone number must be 10 digits",
  },
  "United Kingdom": {
    pattern: /^[1-9]\d{9,10}$/,
    message: "UK phone number must be 10-11 digits",
  },
  Australia: {
    pattern: /^[4-5]\d{8}$/,
    message: "Australian mobile number must be 9 digits starting with 4-5",
  },
  China: {
    pattern: /^1[3-9]\d{9}$/,
    message: "Chinese mobile number must be 11 digits starting with 1",
  },
  Germany: {
    pattern: /^[1-9]\d{9,11}$/,
    message: "German phone number must be 10-12 digits",
  },
  France: {
    pattern: /^[6-7]\d{8}$/,
    message: "French mobile number must be 9 digits starting with 6-7",
  },
  Japan: {
    pattern: /^[789]0\d{8}$/,
    message: "Japanese mobile number must be 11 digits",
  },
  Brazil: {
    pattern: /^[1-9]\d{10}$/,
    message: "Brazilian phone number must be 11 digits",
  },
  Russia: {
    pattern: /^[789]\d{9}$/,
    message: "Russian mobile number must be 10 digits starting with 7-9",
  },
  "Saudi Arabia": {
    pattern: /^5\d{8}$/,
    message: "Saudi mobile number must be 9 digits starting with 5",
  },
  UAE: {
    pattern: /^5\d{8}$/,
    message: "UAE mobile number must be 9 digits starting with 5",
  },
  Pakistan: {
    pattern: /^3\d{9}$/,
    message: "Pakistani mobile number must be 10 digits starting with 3",
  },
  Bangladesh: {
    pattern: /^1[3-9]\d{8}$/,
    message: "Bangladeshi mobile number must be 10 digits starting with 1",
  },
  Nepal: {
    pattern: /^9[6-8]\d{8}$/,
    message: "Nepali mobile number must be 10 digits starting with 96-98",
  },
  "Sri Lanka": {
    pattern: /^7\d{8}$/,
    message: "Sri Lankan mobile number must be 9 digits starting with 7",
  },
  Thailand: {
    pattern: /^[689]\d{8}$/,
    message: "Thai mobile number must be 9 digits starting with 6, 8, or 9",
  },
  Malaysia: {
    pattern: /^1[0-9]\d{7,8}$/,
    message: "Malaysian mobile number must be 9-10 digits starting with 1",
  },
  Singapore: {
    pattern: /^[89]\d{7}$/,
    message: "Singapore mobile number must be 8 digits starting with 8-9",
  },
  Indonesia: {
    pattern: /^8\d{9,10}$/,
    message: "Indonesian mobile number must be 10-11 digits starting with 8",
  },
  Philippines: {
    pattern: /^9\d{9}$/,
    message: "Philippine mobile number must be 10 digits starting with 9",
  },
  Vietnam: {
    pattern: /^[3-9]\d{8}$/,
    message: "Vietnamese mobile number must be 9 digits starting with 3-9",
  },
  "South Korea": {
    pattern: /^1[0-9]\d{7,8}$/,
    message: "South Korean mobile number must be 10-11 digits starting with 1",
  },
  "South Africa": {
    pattern: /^[6-8]\d{8}$/,
    message: "South African mobile number must be 9 digits starting with 6-8",
  },
  Nigeria: {
    pattern: /^[789]\d{9}$/,
    message: "Nigerian mobile number must be 10 digits starting with 7-9",
  },
  Kenya: {
    pattern: /^7\d{8}$/,
    message: "Kenyan mobile number must be 9 digits starting with 7",
  },
  Egypt: {
    pattern: /^1[0-5]\d{8}$/,
    message: "Egyptian mobile number must be 10 digits starting with 10-15",
  },
  Turkey: {
    pattern: /^5\d{9}$/,
    message: "Turkish mobile number must be 10 digits starting with 5",
  },
  Italy: {
    pattern: /^3\d{9}$/,
    message: "Italian mobile number must be 10 digits starting with 3",
  },
  Spain: {
    pattern: /^[67]\d{8}$/,
    message: "Spanish mobile number must be 9 digits starting with 6-7",
  },
  Netherlands: {
    pattern: /^6\d{8}$/,
    message: "Dutch mobile number must be 9 digits starting with 6",
  },
  Belgium: {
    pattern: /^4\d{8}$/,
    message: "Belgian mobile number must be 9 digits starting with 4",
  },
  Switzerland: {
    pattern: /^7[5-9]\d{7}$/,
    message: "Swiss mobile number must be 9 digits starting with 75-79",
  },
  Austria: {
    pattern: /^6[4-9]\d{7}$/,
    message: "Austrian mobile number must be 9 digits starting with 64-69",
  },
  Sweden: {
    pattern: /^7\d{8}$/,
    message: "Swedish mobile number must be 9 digits starting with 7",
  },
  Norway: {
    pattern: /^[49]\d{7}$/,
    message: "Norwegian mobile number must be 8 digits starting with 4 or 9",
  },
  Poland: {
    pattern: /^[5-9]\d{8}$/,
    message: "Polish mobile number must be 9 digits starting with 5-9",
  },
  Portugal: {
    pattern: /^9\d{8}$/,
    message: "Portuguese mobile number must be 9 digits starting with 9",
  },
  Greece: {
    pattern: /^6\d{9}$/,
    message: "Greek mobile number must be 10 digits starting with 6",
  },
  Iran: {
    pattern: /^9\d{9}$/,
    message: "Iranian mobile number must be 10 digits starting with 9",
  },
  Iraq: {
    pattern: /^7[3-9]\d{8}$/,
    message: "Iraqi mobile number must be 10 digits starting with 73-79",
  },
  Israel: {
    pattern: /^5\d{8}$/,
    message: "Israeli mobile number must be 9 digits starting with 5",
  },
  Qatar: {
    pattern: /^[35]\d{7}$/,
    message: "Qatari mobile number must be 8 digits starting with 3 or 5",
  },
  "Hong Kong": {
    pattern: /^[5-9]\d{7}$/,
    message: "Hong Kong mobile number must be 8 digits starting with 5-9",
  },
  Taiwan: {
    pattern: /^9\d{8}$/,
    message: "Taiwanese mobile number must be 9 digits starting with 9",
  },
  Colombia: {
    pattern: /^3\d{9}$/,
    message: "Colombian mobile number must be 10 digits starting with 3",
  },
  Mexico: {
    pattern: /^[1-9]\d{9}$/,
    message: "Mexican mobile number must be 10 digits",
  },
  Argentina: {
    pattern: /^9\d{9}$/,
    message: "Argentine mobile number must be 10 digits starting with 9",
  },
  Chile: {
    pattern: /^9\d{8}$/,
    message: "Chilean mobile number must be 9 digits starting with 9",
  },
  "New Zealand": {
    pattern: /^2[0-9]\d{7}$/,
    message: "New Zealand mobile number must be 9 digits starting with 2",
  },
  Ghana: {
    pattern: /^[2-5]\d{8}$/,
    message: "Ghanaian mobile number must be 9 digits starting with 2-5",
  },
  Afghanistan: {
    pattern: /^7\d{8}$/,
    message: "Afghan mobile number must be 9 digits starting with 7",
  },
  Albania: {
    pattern: /^6[6-9]\d{7}$/,
    message: "Albanian mobile number must be 9 digits starting with 66-69",
  },
  Algeria: {
    pattern: /^[5-7]\d{8}$/,
    message: "Algerian mobile number must be 9 digits starting with 5-7",
  },
  Ukraine: {
    pattern: /^[3-9]\d{8}$/,
    message: "Ukrainian mobile number must be 9 digits starting with 3-9",
  },
};

// Default pattern for countries not in the list
const defaultPattern = {
  pattern: /^\d{6,15}$/,
  message: "Phone number must be 6-15 digits",
};

/** Reject known spam/fake/virtual phone patterns */
function isSpamOrFakePhone(cleanPhone) {
  if (!cleanPhone || cleanPhone.length < 6) return false;
  const len = cleanPhone.length;

  // All same digit (e.g. 1111111111, 0000000000)
  if (/^(\d)\1+$/.test(cleanPhone)) return true;

  // Sequential ascending (e.g. 1234567890)
  const ascending = cleanPhone.split("").every((d, i) => i === 0 || parseInt(d, 10) === (parseInt(cleanPhone[i - 1], 10) + 1) % 10);
  if (ascending && len >= 6) return true;

  // Sequential descending (e.g. 9876543210)
  const descending = cleanPhone.split("").every((d, i) => i === 0 || parseInt(d, 10) === (parseInt(cleanPhone[i - 1], 10) - 1 + 10) % 10);
  if (descending && len >= 6) return true;

  // US/Canada fake 555 (without country code we check suffix; with +1, 555 is common fake)
  if (len >= 10 && cleanPhone.slice(-10, -7) === "555") return true;
  if (len >= 3 && cleanPhone.slice(0, 3) === "555") return true;

  // Repeated 2-digit pattern (e.g. 1212121212, 12341234)
  if (len >= 6) {
    const two = cleanPhone.slice(0, 2);
    if (two[0] !== two[1] && cleanPhone === two.repeat(Math.ceil(len / 2)).slice(0, len)) return true;
    const four = cleanPhone.slice(0, 4);
    if (len >= 8 && cleanPhone === four.repeat(Math.ceil(len / 4)).slice(0, len)) return true;
  }

  // Too many consecutive repeated digits (e.g. 111222333, 999988887777)
  if (/(\d)\1{4,}/.test(cleanPhone)) return true;

  return false;
}

export const validateName = (name) => {
  if (!name || !name.trim()) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  if (name.trim().length > 50) {
    return "Name must be less than 50 characters";
  }
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return "Name can only contain letters, spaces, hyphens, and apostrophes";
  }
  return "";
};

export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address (e.g., example@domain.com)";
  }
  return "";
};

export const validatePhoneNumber = (phoneNumber, countryCode, country) => {
  if (!phoneNumber || !phoneNumber.trim()) {
    return "Phone number is required";
  }

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

  if (!/^\d+$/.test(cleanPhone)) {
    return "Phone number can only contain digits";
  }

  // Get country-specific validation
  const countryPattern =
    country && phonePatterns[country] ? phonePatterns[country] : defaultPattern;

  if (!countryPattern.pattern.test(cleanPhone)) {
    return countryPattern.message;
  }

  if (isSpamOrFakePhone(cleanPhone)) {
    return "Please enter a valid phone number";
  }

  if (countryCode && !/^\+?[\d]+$/.test(countryCode.trim())) {
    return "Please enter a valid country code";
  }

  return "";
};

export const validateCountry = (country) => {
  if (!country || !country.trim()) {
    return "Country is required";
  }
  return "";
};

export const validateClassName = (className) => {
  if (!className || !className.trim()) {
    return "Class name is required";
  }
  return "";
};

export const validatePassword = (password) => {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return "";
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return "Confirm password is required";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return "";
};

export const validateForm = (formData, validateVerification) => {
  const errors = {};

  // Validate name if provided
  if (formData.name?.trim()) {
    const nameError = validateName(formData.name);
    if (nameError) errors.name = nameError;
  } else {
    errors.name = "Name is required";
  }

  // Validate email if provided
  if (formData.email?.trim()) {
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
  } else {
    errors.email = "Email is required";
  }

  // Validate country
  const countryError = validateCountry(formData.country);
  if (countryError) errors.country = countryError;

  // Validate class name
  const classNameError = validateClassName(formData.className);
  if (classNameError) errors.className = classNameError;

  // Validate phone number (now required)
  const phoneError = validatePhoneNumber(
    formData.phoneNumber,
    formData.countryCode,
    formData.country
  );
  if (phoneError) errors.phoneNumber = phoneError;

  // Validate verification
  if (!validateVerification()) {
    errors.verification = "Please complete the verification";
  }

  return errors;
};
