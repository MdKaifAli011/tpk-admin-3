/**
 * MathJax loader utility with proper initialization
 */

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const MATHJAX_SCRIPT_SRC = `${basePath}/vendor/mathjax/MathJax.js?config=TeX-AMS_HTML`;

let mathJaxPromise = null;
let mathJaxError = false;

const loadMathJax = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  
  // If MathJax is already loaded and ready
  if (window.MathJax && window.MathJax.isReady) {
    return Promise.resolve(window.MathJax);
  }
  
  // If MathJax exists but not ready, wait for it
  if (window.MathJax && window.MathJax.Hub) {
    return new Promise((resolve) => {
      if (window.MathJax.isReady) {
        resolve(window.MathJax);
      } else {
        try {
          window.MathJax.Hub.Register.StartupHook("End", () => {
            resolve(window.MathJax);
          });
        } catch (err) {
          // If hook fails, resolve after delay
          setTimeout(() => resolve(window.MathJax), 1000);
        }
      }
    });
  }
  
  // If previous load failed, allow retry
  if (mathJaxError) {
    mathJaxPromise = null;
    mathJaxError = false;
  }

  if (!mathJaxPromise) {
    mathJaxPromise = new Promise((resolve, reject) => {
      // Check if script already exists in DOM
      const existingScript = document.querySelector(
        `script[src*="MathJax.js"]`
      );

      if (existingScript) {
        // Script exists, wait for MathJax to be available
        let attempts = 0;
        const maxAttempts = 200; // 10 seconds max wait
        
        const checkInterval = setInterval(() => {
          attempts++;
          
          if (window.MathJax) {
            clearInterval(checkInterval);
            if (window.MathJax.isReady) {
              resolve(window.MathJax);
            } else if (window.MathJax.Hub && window.MathJax.Hub.Register) {
              try {
                window.MathJax.Hub.Register.StartupHook("End", () => {
                  resolve(window.MathJax);
                });
              } catch (err) {
                setTimeout(() => resolve(window.MathJax), 500);
              }
            } else {
              setTimeout(() => resolve(window.MathJax), 500);
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            reject(new Error("MathJax not available after script load"));
          }
        }, 50);

        return;
      }

      // Create and load script
      const script = document.createElement("script");
      script.src = MATHJAX_SCRIPT_SRC;
      script.async = true;
      script.id = "mathjax-script";

      script.onerror = (error) => {
        mathJaxError = true;
        mathJaxPromise = null;
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.error("MathJax script failed to load from:", MATHJAX_SCRIPT_SRC);
        }
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error(`Failed to load MathJax: ${error?.message || "Script load error"}`));
      };

      // Wait for MathJax to be available after script loads
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        
        // Poll for MathJax availability
        let attempts = 0;
        const maxAttempts = 200; // 10 seconds max wait
        
        const checkMathJax = () => {
          attempts++;
          
          if (window.MathJax) {
            // MathJax is loaded
            if (window.MathJax.isReady) {
              resolve(window.MathJax);
            } else if (window.MathJax.Hub && window.MathJax.Hub.Register) {
              // Wait for initialization to complete
              try {
                window.MathJax.Hub.Register.StartupHook("End", () => {
                  resolve(window.MathJax);
                });
              } catch (err) {
                // If hook fails, resolve anyway after a delay
                setTimeout(() => resolve(window.MathJax), 500);
              }
            } else {
              // MathJax loaded but no Hub, resolve anyway
              setTimeout(() => resolve(window.MathJax), 500);
            }
          } else if (attempts < maxAttempts) {
            // Keep checking every 50ms
            setTimeout(checkMathJax, 50);
          } else {
            // Timeout - only log in development
            if (process.env.NODE_ENV === "development") {
              console.error("MathJax not available after 10 seconds");
            }
            reject(new Error("MathJax not available after script load"));
          }
        };

        // Start checking after a short delay
        setTimeout(checkMathJax, 100);
      };

      // Append to document head or body
      const head = document.head || document.getElementsByTagName("head")[0] || document.body;
      if (head) {
        head.appendChild(script);
      } else {
        reject(new Error("Cannot find document head or body"));
      }
    });

    // Clear promise on error to allow retry
    mathJaxPromise.catch((error) => {
      // Only log in development
      if (process.env.NODE_ENV === "development") {
        console.error("MathJax load promise rejected:", error);
      }
    });
  }

  return mathJaxPromise;
};

export default loadMathJax;
export { MATHJAX_SCRIPT_SRC };
