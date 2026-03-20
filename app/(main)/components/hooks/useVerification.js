import { useState, useCallback, useEffect } from "react";

const CAPTCHA_STORAGE_KEY = "captcha_verification_block";
const CAPTCHA_FAILURES_KEY = "captcha_failures";
const MAX_FAILURES_BEFORE_BLOCK = 5;
const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function getBlockStatus() {
  if (typeof window === "undefined") return { blocked: false };
  const until = localStorage.getItem(CAPTCHA_STORAGE_KEY);
  if (!until) return { blocked: false };
  const untilMs = parseInt(until, 10);
  if (Date.now() < untilMs) {
    return { blocked: true, retryAfterMs: untilMs - Date.now() };
  }
  localStorage.removeItem(CAPTCHA_STORAGE_KEY);
  localStorage.removeItem(CAPTCHA_FAILURES_KEY);
  return { blocked: false };
}

export const useVerification = () => {
  const [verificationQuestion, setVerificationQuestion] = useState("");
  const [verificationAnswer, setVerificationAnswer] = useState("");
  const [userVerificationAnswer, setUserVerificationAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [blockStatus, setBlockStatus] = useState(() => getBlockStatus());

  useEffect(() => {
    const interval = setInterval(() => setBlockStatus(getBlockStatus()), 5000);
    return () => clearInterval(interval);
  }, []);

  const getVerificationBlockStatus = useCallback(() => {
    const status = getBlockStatus();
    setBlockStatus(status);
    return status;
  }, []);

  const recordVerificationFailure = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(CAPTCHA_FAILURES_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    localStorage.setItem(CAPTCHA_FAILURES_KEY, String(count));
    if (count >= MAX_FAILURES_BEFORE_BLOCK) {
      localStorage.setItem(CAPTCHA_STORAGE_KEY, String(Date.now() + BLOCK_DURATION_MS));
      localStorage.removeItem(CAPTCHA_FAILURES_KEY);
      setBlockStatus(getBlockStatus());
    }
  }, []);

  const resetVerificationFailures = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CAPTCHA_FAILURES_KEY);
    localStorage.removeItem(CAPTCHA_STORAGE_KEY);
    setBlockStatus({ blocked: false });
  }, []);

  const generateVerification = useCallback(() => {
    const type = Math.random() > 0.5 ? "math" : "char";
    setUserVerificationAnswer("");
    setIsVerified(false);

    if (type === "math") {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const operations = ["+", "-", "*"];
      const operation = operations[Math.floor(Math.random() * operations.length)];

      let answer;
      switch (operation) {
        case "+":
          answer = num1 + num2;
          break;
        case "-":
          answer = num1 - num2;
          break;
        case "*":
          answer = num1 * num2;
          break;
        default:
          answer = num1 + num2;
      }

      setVerificationQuestion(`${num1} ${operation} ${num2} = ?`);
      setVerificationAnswer(answer.toString());
    } else {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setVerificationQuestion(code);
      setVerificationAnswer(code);
    }
  }, []);

  const handleVerificationChange = useCallback(
    (value, setErrors) => {
      setUserVerificationAnswer(value);
      if (value.trim() === verificationAnswer) {
        setIsVerified(true);
        if (setErrors) {
          setErrors((prev) => ({
            ...prev,
            verification: "",
          }));
        }
      } else {
        setIsVerified(false);
      }
    },
    [verificationAnswer]
  );

  const validateVerification = useCallback(() => {
    const status = getBlockStatus();
    if (status.blocked) return false;
    return isVerified && userVerificationAnswer.trim() === verificationAnswer;
  }, [isVerified, userVerificationAnswer, verificationAnswer]);

  const resetVerification = useCallback(() => {
    setUserVerificationAnswer("");
    setIsVerified(false);
  }, []);

  return {
    verificationQuestion,
    userVerificationAnswer,
    isVerified,
    generateVerification,
    handleVerificationChange,
    validateVerification,
    resetVerification,
    getVerificationBlockStatus,
    recordVerificationFailure,
    resetVerificationFailures,
    blockStatus,
  };
};

