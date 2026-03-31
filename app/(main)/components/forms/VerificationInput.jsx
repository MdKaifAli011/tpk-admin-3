"use client";

const VerificationInput = ({
  verificationQuestion,
  userVerificationAnswer,
  isVerified,
  error,
  isSubmitting,
  onChange,
  onRefresh,
}) => {
  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 border-2 rounded-lg transition-all ${error
            ? "border-red-300 bg-red-50"
            : isVerified
              ? "border-green-500 bg-green-50"
              : "border-gray-300 bg-white"
          }`}
      >
        <div className="shrink-0">
          {isVerified ? (
            <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 bg-gray-200 rounded flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1.5 text-center">
            <span className="text-base font-bold text-gray-800 tracking-wider">
              {verificationQuestion}
            </span>
          </div>
          <div className="w-20">
            <input
              type="text"
              value={userVerificationAnswer}
              onChange={onChange}
              placeholder={verificationQuestion.includes("=") ? "Ans" : "Code"}
              className={`w-full px-2 py-1.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center font-semibold text-sm ${error
                  ? "border-red-300 bg-red-50"
                  : isVerified
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-white"
                }`}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSubmitting}
            className="shrink-0 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh verification"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-0.5 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default VerificationInput;

