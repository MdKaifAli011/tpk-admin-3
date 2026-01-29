"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaSearch, FaImage, FaUpload, FaSpinner, FaVideo, FaAlignLeft, FaAlignCenter, FaAlignRight } from "react-icons/fa";
import api from "@/lib/api";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const CKEDITOR_SCRIPT = `${basePath}/vendor/ckeditor/ckeditor.js`;
const MATHJAX_SCRIPT = `${basePath}/vendor/mathjax/MathJax.js?config=TeX-AMS_HTML`;
const CKEDITOR_CONTENTS_CSS = `${basePath}/vendor/ckeditor/contents.css`;

const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Start writing your content...",
  disabled = false,
  className = "",
  // Context props for image uploads
  examId = null,
  subjectId = null,
  unitId = null,
  chapterId = null,
  topicId = null,
  subtopicId = null,
  definitionId = null,
  hideAdminTools = false,
}) => {
  const titleCasePreserveAcronyms = (text) => {
    if (!text) return "";
    return String(text)
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        const m = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$/);
        if (!m) return token;
        const [, prefix, core, suffix] = m;

        const hasLetter = /[A-Za-z]/.test(core);
        const isAllCaps =
          hasLetter &&
          core === core.toUpperCase() &&
          core !== core.toLowerCase();

        const nextCore = isAllCaps
          ? core
          : core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();

        return `${prefix}${nextCore}${suffix}`;
      })
      .join(" ");
  };

  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showFormLinkModal, setShowFormLinkModal] = useState(false);
  const [formLinkText, setFormLinkText] = useState("");
  const [formLinkFormId, setFormLinkFormId] = useState(null);
  const [formLinkRedirect, setFormLinkRedirect] = useState("");
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imageError, setImageError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [insertOptions, setInsertOptions] = useState({
    title: "",
    description: "",
    buttonText: "",
    buttonColor: "#2563eb",
    buttonLink: "",
    imageUrl: "",
  });
  const [buttonOptions, setButtonOptions] = useState({
    text: "",
    color: "#2563eb", // Default blue
    link: "",
  });
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoTab, setVideoTab] = useState("upload"); // "upload" or "youtube"
  const [videoAlign, setVideoAlign] = useState("center"); // "left", "center", "right"
  const [customWidth, setCustomWidth] = useState("640");
  const [customHeight, setCustomHeight] = useState("360");
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const placeholderRef = useRef(placeholder);

  const instanceId = useMemo(
    () => `rte-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    placeholderRef.current = placeholder;
  }, [placeholder]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalWarn = console.warn;
    const originalError = console.error;
    const marker = "CKEditor 4.22.1";

    const shouldSuppress = (args) =>
      args.some((arg) => typeof arg === "string" && arg.includes(marker));

    console.warn = (...args) => {
      if (shouldSuppress(args)) return;
      originalWarn(...args);
    };

    console.error = (...args) => {
      if (shouldSuppress(args)) return;
      originalError(...args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const toolbarConfig = useMemo(
    () => [
      {
        name: "document",
        items: ["Source", "NewPage", "Preview", "Print", "Templates"],
      },
      { name: "clipboard", items: ["Cut", "Copy", "Paste", "Undo", "Redo"] },
      { name: "editing", items: ["Find", "Replace", "SelectAll", "Scayt"] },
      { name: "styles", items: ["Format", "Font", "FontSize"] },
      {
        name: "basicstyles",
        items: [
          "Bold",
          "Italic",
          "Underline",
          "Strike",
          "Subscript",
          "Superscript",
          "RemoveFormat",
        ],
      },
      { name: "colors", items: ["TextColor", "BGColor"] },
      {
        name: "paragraph",
        items: [
          "NumberedList",
          "BulletedList",
          "Outdent",
          "Indent",
          "Blockquote",
          "JustifyLeft",
          "JustifyCenter",
          "JustifyRight",
          "JustifyBlock",
        ],
      },
      {
        name: "insert",
        items: [
          "Image",
          "Table",
          "HorizontalRule",
          "Smiley",
          "SpecialChar",
          "Iframe",
          "Mathjax",
        ],
      },
      { name: "links", items: ["Link", "Unlink", "Anchor"] },
      { name: "tools", items: ["Maximize", "ShowBlocks"] },
      { name: "about", items: ["About"] },
    ],
    []
  );

  useEffect(() => {
    let isMounted = true;
    const ensureScript = (src, attr) =>
      new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[${attr}]`);
        if (existing) {
          if (
            existing.dataset.loaded === "true" ||
            existing.readyState === "complete"
          ) {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.setAttribute(attr, "true");
        script.addEventListener("load", () => {
          script.dataset.loaded = "true";
          resolve();
        });
        script.addEventListener("error", reject);
        document.head.appendChild(script);
      });

    const initializeEditor = async () => {
      if (typeof window === "undefined") return;

      await ensureScript(CKEDITOR_SCRIPT, "data-ckeditor");
      await ensureScript(MATHJAX_SCRIPT, "data-mathjax");

      if (!isMounted || !textareaRef.current) return;

      const { CKEDITOR } = window;
      if (!CKEDITOR) return;

      try {
        if (CKEDITOR.config) {
          CKEDITOR.config.versionCheck = false;
        }
      } catch (error) {
        // silently ignore inability to override version check
      }

      if (!CKEDITOR._suppressLegacyWarning) {
        CKEDITOR._suppressLegacyWarning = true;
        CKEDITOR.on("notificationShow", (evt) => {
          try {
            const message = evt?.data?.notification?.message;
            if (
              typeof message === "string" &&
              message.includes("CKEditor 4.22.1")
            ) {
              evt.data.notification?.hide?.();
              evt.cancel();
            }
          } catch (error) {
            // ignore suppression errors
          }
        });
      }

      if (CKEDITOR.instances[instanceId]) {
        CKEDITOR.instances[instanceId].destroy(true);
      }

      const editor = CKEDITOR.replace(textareaRef.current, {
        height: 420,
        removePlugins: "resize",
        extraPlugins:
          "mathjax,colorbutton,colordialog,justify,font,clipboard,smiley",
        mathJaxLib: MATHJAX_SCRIPT,
        // Make the iframe content match the site typography + responsive tables.
        contentsCss: [CKEDITOR_CONTENTS_CSS],
        bodyClass: "rich-text-content",
        autoParagraph: true,
        ignoreEmptyParagraph: true,
        allowedContent: true,
        placeholder: placeholderRef.current,
        readOnly: false,
        toolbar: toolbarConfig,
      });

      editorRef.current = editor;

      editor.on("instanceReady", () => {
        if (!isMounted) return;
        setIsReady(true);
        if (valueRef.current) {
          editor.setData(valueRef.current);
        }
        if (disabled) {
          editor.setReadOnly(true);
        }
        editor.fire("change");

        // Add click listener to handle editing existing forms/buttons
        const doc = editor.document;
        if (doc) {
          doc.on("click", (evt) => {
            const element = evt.data.getTarget();
            const formEmbed = element.getAscendant("span", true);

            if (formEmbed && formEmbed.hasClass("form-embed-inline")) {
              const formId = formEmbed.getAttribute("data-form-id");
              const title = formEmbed.getAttribute("data-title");
              const description = formEmbed.getAttribute("data-description");
              const buttonText = formEmbed.getAttribute("data-button-text");
              const buttonColor = formEmbed.getAttribute("data-button-color");
              const buttonLink = formEmbed.getAttribute("data-button-link");
              const imageUrl = formEmbed.getAttribute("data-image-url");

              if (formId) {
                // Populate options from the clicked element
                setSelectedForm({ formId, settings: { title, description, buttonText, buttonColor, imageUrl, redirectLink: buttonLink } });
                setInsertOptions({
                  title: title || "",
                  description: description || "",
                  buttonText: buttonText || "Open Form",
                  buttonColor: buttonColor || "#2563eb",
                  buttonLink: buttonLink || "",
                  imageUrl: imageUrl || "",
                });
                setShowFormModal(true);
              }
            }
          });
        }
      });

      editor.on("change", () => {
        const data = editor.getData();
        onChangeRef.current?.(data);
      });
    };

    initializeEditor().catch((error) => {
      console.error("Failed to initialize CKEditor", error);
    });

    return () => {
      isMounted = false;
      if (editorRef.current) {
        editorRef.current.destroy(true);
        editorRef.current = null;
      }
    };
  }, [toolbarConfig, instanceId, disabled]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentData = editor.getData();
    if (value !== undefined && value !== currentData) {
      editor.setData(value || "");
    }
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setReadOnly(disabled);
  }, [disabled]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.config.placeholder = placeholder;
  }, [placeholder]);

  // Fetch forms when form modal or form-link modal opens
  useEffect(() => {
    if (showFormModal || showFormLinkModal) {
      fetchForms();
    }
  }, [showFormModal, showFormLinkModal]);

  const fetchForms = async () => {
    try {
      setLoadingForms(true);
      const response = await api.get("/form?status=active");
      if (response.data?.success) {
        setForms(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoadingForms(false);
    }
  };

  const handleFormSelect = (form) => {
    setSelectedForm(form);
    setInsertOptions({
      title: form.settings?.title || form.formId || "",
      description: form.settings?.description || "",
      buttonText: form.settings?.buttonText || "Open Form",
      buttonColor: form.settings?.buttonColor || "#2563eb",
      buttonLink: form.settings?.redirectLink || "",
      imageUrl: form.settings?.imageUrl || "",
    });
  };

  const openFormLinkModal = () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const sel = editor.getSelection();
      const text = sel ? sel.getSelectedText() : "";
      if (!text || !String(text).trim()) {
        alert("Please select some text first. The selected text will become a clickable link that opens the form.");
        return;
      }
      setFormLinkText(String(text).trim());
      setFormLinkFormId(null);
      setFormLinkRedirect("");
      setShowFormLinkModal(true);
    } catch (e) {
      alert("Please select some text first.");
    }
  };

  const insertFormLink = () => {
    const editor = editorRef.current;
    if (!editor || !formLinkFormId || !formLinkText.trim()) return;
    const formId = formLinkFormId;
    const escapeHtml = (str) => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };
    const redirectAttr = formLinkRedirect.trim() ? ` data-redirect-after="${escapeHtml(formLinkRedirect.trim())}"` : "";
    const linkHtml = `<a href="#form-modal:${escapeHtml(formId)}" class="form-modal-link" data-form-id="${escapeHtml(formId)}"${redirectAttr}>${escapeHtml(formLinkText)}</a>`;
    editor.insertHtml(linkHtml);
    setShowFormLinkModal(false);
    setFormLinkText("");
    setFormLinkFormId(null);
    setFormLinkRedirect("");
  };

  const insertFormCode = () => {
    const editor = editorRef.current;
    if (!editor || !selectedForm) return;

    const formId = selectedForm.formId;
    const title = insertOptions.title.trim() || selectedForm.formId;
    const description = insertOptions.description.trim();
    const buttonText = titleCasePreserveAcronyms(
      insertOptions.buttonText.trim() || "Open Form"
    );
    const buttonColor = insertOptions.buttonColor?.trim() || "#2563eb";
    const buttonLink = insertOptions.buttonLink.trim();
    const imageUrl = insertOptions.imageUrl.trim();

    const sanitizeHexColor = (value) => {
      if (!value) return "#2563eb";
      const v = String(value).trim();
      return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v) ? v : "#2563eb";
    };

    const safeButtonColor = sanitizeHexColor(buttonColor);

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
        : { r: 37, g: 99, b: 235 };
    };

    const rgb = hexToRgb(safeButtonColor);
    const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    const escapeHtml = (str) => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    // Use same style as insertButtonCode
    const buttonStyle = `
      display: inline-block;
      padding: 8px 16px;
      background-color: ${safeButtonColor};
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: all 0.2s ease;
      font-family: inherit;
      line-height: 1.5;
      margin: 2px 4px;
      box-shadow: 0 2px 4px rgba(${rgbString}, 0.2);
      vertical-align: middle;
      white-space: nowrap;
    `;

    const contentHtml = `
      <button 
        type="button"
        style="${buttonStyle}" 
        contenteditable="false" 
        title="Form: ${escapeHtml(title)} (Click to configure)"
        onmouseover="this.style.backgroundColor='rgba(${rgbString}, 0.9)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 6px rgba(${rgbString}, 0.3)'"
        onmouseout="this.style.backgroundColor='${safeButtonColor}'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(${rgbString}, 0.2)'"
      >
         ${escapeHtml(buttonText)}
      </button>
    `;

    const formCode = `<span class="form-embed-inline" data-form-id="${formId}" data-title="${escapeHtml(
      title
    )}" data-description="${escapeHtml(
      description
    )}" data-button-text="${escapeHtml(
      buttonText
    )}" data-button-color="${escapeHtml(
      safeButtonColor
    )}" data-button-link="${escapeHtml(
      buttonLink
    )}" data-image-url="${escapeHtml(
      imageUrl
    )}" style="display: inline-block; vertical-align: middle;" contenteditable="false">${contentHtml}</span>`;

    editor.insertHtml(formCode);
    setShowFormModal(false);
    setSelectedForm(null);
    setInsertOptions({
      title: "",
      description: "",
      buttonText: "",
      buttonColor: "#2563eb",
      buttonLink: "",
      imageUrl: "",
    });
  };

  const insertButtonCode = () => {
    const editor = editorRef.current;
    if (!editor || !buttonOptions.text.trim()) return;

    const buttonText = titleCasePreserveAcronyms(buttonOptions.text.trim());
    const buttonColor = buttonOptions.color || "#2563eb";
    const buttonLink = buttonOptions.link.trim();

    const escapeHtml = (str) => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    // Convert hex color to RGB for better browser compatibility
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
        : { r: 37, g: 99, b: 235 }; // Default blue
    };

    const rgb = hexToRgb(buttonColor);
    const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    // Inline button styles - truly inline-block for insertion anywhere in text
    const buttonStyle = `
      display: inline-block;
      padding: 8px 16px;
      background-color: ${buttonColor};
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: all 0.2s ease;
      font-family: inherit;
      line-height: 1.5;
      margin: 2px 4px;
      box-shadow: 0 2px 4px rgba(${rgbString}, 0.2);
      vertical-align: middle;
      white-space: nowrap;
    `;

    let buttonHtml;

    if (buttonLink && buttonLink.trim()) {
      // Button with link - truly inline
      buttonHtml = `
        <span class="inline-button-wrapper" style="display: inline-block; vertical-align: middle;" contenteditable="false">
          <a 
            href="${escapeHtml(buttonLink)}" 
            class="inline-button" 
            style="${buttonStyle}"
            onmouseover="this.style.backgroundColor='rgba(${rgbString}, 0.9)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 6px rgba(${rgbString}, 0.3)'"
            onmouseout="this.style.backgroundColor='${buttonColor}'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(${rgbString}, 0.2)'"
            target="_blank"
            rel="noopener noreferrer"
            data-button-link="${escapeHtml(buttonLink)}"
          >
            ${escapeHtml(buttonText)}
          </a>
        </span>
      `;
    } else {
      // Button without link (just styled button) - truly inline
      buttonHtml = `
        <span class="inline-button-wrapper" style="display: inline-block; vertical-align: middle;" contenteditable="false">
          <button 
            type="button"
            class="inline-button" 
            style="${buttonStyle}"
            onmouseover="this.style.backgroundColor='rgba(${rgbString}, 0.9)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 6px rgba(${rgbString}, 0.3)'"
            onmouseout="this.style.backgroundColor='${buttonColor}'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(${rgbString}, 0.2)'"
            disabled
            readonly
          >
            ${escapeHtml(buttonText)}
          </button>
        </span>
      `;
    }

    editor.insertHtml(buttonHtml);
    setShowButtonModal(false);
    setButtonOptions({
      text: "",
      color: "#2563eb",
      link: "",
    });
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError("File size exceeds 10MB limit.");
      return;
    }

    await uploadAndInsertImage(file);
  };

  // Handle clipboard paste
  useEffect(() => {
    if (!isReady || disabled || !showImageModal) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await uploadAndInsertImage(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [isReady, disabled, showImageModal]);

  // Upload image and insert into editor
  const uploadAndInsertImage = async (file) => {
    try {
      setUploadingImage(true);
      setImageError("");

      const formData = new FormData();
      formData.append("image", file);

      // Add context IDs if available
      if (examId) formData.append("examId", examId);
      if (subjectId) formData.append("subjectId", subjectId);
      if (unitId) formData.append("unitId", unitId);
      if (chapterId) formData.append("chapterId", chapterId);
      if (topicId) formData.append("topicId", topicId);
      if (subtopicId) formData.append("subtopicId", subtopicId);
      if (definitionId) formData.append("definitionId", definitionId);

      const response = await api.post("/upload/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success && response.data?.data?.url) {
        const imageUrl = response.data.data.url;
        const editor = editorRef.current;

        if (editor) {
          // Insert image into editor
          const imageHtml = `<img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`;
          editor.insertHtml(imageHtml);
        }

        setShowImageModal(false);
        setImageError("");
      } else {
        setImageError(response.data?.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      setImageError(
        error.response?.data?.message ||
        error.message ||
        "Failed to upload image. Please try again."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle video upload
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      setVideoError("Invalid file type. Only MP4, WebM, OGG, and MOV are allowed.");
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setVideoError("File size exceeds 100MB limit.");
      return;
    }

    await uploadAndInsertVideo(file);
  };

  // Get video dimensions and alignment based on selection
  const getVideoDimensions = () => {
    const w = parseInt(customWidth) || 640;
    const h = parseInt(customHeight) || 360;
    // Calculate aspect ratio percentage
    const aspect = (h / w) * 100 || 56.25;

    let dims = {
      width: `${w}px`,
      height: `${h}px`,
      maxWidth: "100%",
      aspectRatio: `${w}/${h}`,
      paddingBottom: `${aspect}%`
    };

    // Alignment logic
    let margin = "10px";
    let textAlign = "center";
    let parentStyle = "text-align: center; margin: 20px 0;";

    if (videoAlign === "left") {
      textAlign = "left";
      parentStyle = "text-align: left; margin: 20px 0;";
      margin = "0 20px 20px 0";
    } else if (videoAlign === "right") {
      textAlign = "right";
      parentStyle = "text-align: right; margin: 20px 0;";
      margin = "20px 0 20px 20px";
    } else {
      parentStyle = "text-align: center; margin: 20px 0;";
      margin = "0 auto";
    }

    return { ...dims, margin, textAlign, parentStyle, w, h };
  };

  // Upload video and insert into editor
  const uploadAndInsertVideo = async (file) => {
    try {
      setUploadingVideo(true);
      setVideoError("");

      const formData = new FormData();
      formData.append("video", file);

      // Add context IDs if available
      if (examId) formData.append("examId", examId);
      if (subjectId) formData.append("subjectId", subjectId);
      if (unitId) formData.append("unitId", unitId);
      if (chapterId) formData.append("chapterId", chapterId);
      if (topicId) formData.append("topicId", topicId);
      if (subtopicId) formData.append("subtopicId", subtopicId);
      if (definitionId) formData.append("definitionId", definitionId);

      const response = await api.post("/upload/video", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success && response.data?.data?.url) {
        const videoUrl = response.data.data.url;
        const editor = editorRef.current;
        const dims = getVideoDimensions();

        if (editor) {
          try {
            editor.focus();
            // Insert responsive video into editor
            const parentStyle = dims.parentStyle;
            const containerStyle = `display: inline-block; vertical-align: middle; position: relative; width: ${dims.width}; height: auto; aspect-ratio: ${dims.aspectRatio}; max-width: 100%; cursor: pointer; border-radius: 8px; overflow: hidden; background: #000;`;
            const videoHtml = `<div class="video-parent-container" style="${parentStyle}"><span class="video-container" data-video-url="${videoUrl}" data-video-type="upload" data-mime-type="${file.type}" style="${containerStyle}"><span class="video-play-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); z-index: 10; pointer-events: none;"><span style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);"><span style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 20px solid white; margin-left: 5px;"></span></span></span><video style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; background: #000; pointer-events: none; display: block;" preload="metadata"><source src="${videoUrl}" type="${file.type}" />Your browser does not support the video tag.</video></span></div>`;
            editor.insertHtml(videoHtml);
          } catch (err) {
            console.error("Error inserting video:", err);
          }
        }

        setShowVideoModal(false);
        setVideoError("");
        setYoutubeUrl("");
        setVideoTab("upload");
        setVideoAlign("center");
        setCustomWidth("640");
        setCustomHeight("360");
      } else {
        setVideoError(response.data?.message || "Failed to upload video");
      }
    } catch (error) {
      console.error("Video upload error:", error);
      setVideoError(
        error.response?.data?.message ||
        error.message ||
        "Failed to upload video. Please try again."
      );
    } finally {
      setUploadingVideo(false);
    }
  };

  // Extract YouTube video ID from URL (including YouTube Shorts)
  const extractYouTubeId = (url) => {
    if (!url) return null;

    // Handle various YouTube URL formats including Shorts
    const patterns = [
      // YouTube Shorts: youtube.com/shorts/VIDEO_ID
      /youtube\.com\/shorts\/([^&\n?#\/]+)/,
      // Standard watch URL: youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      // Embed URL: youtube.com/embed/VIDEO_ID
      /youtube\.com\/embed\/([^&\n?#]+)/,
      // Old format: youtube.com/v/VIDEO_ID
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  // Insert YouTube video
  const insertYouTubeVideo = () => {
    const editor = editorRef.current;
    if (!editor || !youtubeUrl.trim()) return;

    const videoId = extractYouTubeId(youtubeUrl);

    if (!videoId) {
      setVideoError("Invalid YouTube URL. Please enter a valid YouTube video or Shorts link (e.g., youtube.com/watch?v=..., youtube.com/shorts/..., or youtu.be/...).");
      return;
    }

    const dims = getVideoDimensions();

    try {
      editor.focus();
      const parentStyle = dims.parentStyle;
      const containerStyle = `display: inline-block; vertical-align: middle; position: relative; width: ${dims.width}; height: auto; aspect-ratio: ${dims.aspectRatio}; max-width: 100%; cursor: pointer; border-radius: 8px; overflow: hidden; background: #000;`;
      const youtubeHtml = `<div class="video-parent-container" style="${parentStyle}"><span class="video-container" data-video-url="https://www.youtube.com/embed/${videoId}" data-video-type="youtube" style="${containerStyle}"><span class="video-play-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); z-index: 10; pointer-events: none;"><span style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);"><span style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 20px solid white; margin-left: 5px;"></span></span></span><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; background: #000; pointer-events: none; display: block;" src="https://www.youtube.com/embed/${videoId}?controls=0&showinfo=0&rel=0&modestbranding=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></span></div>`;

      editor.insertHtml(youtubeHtml);
    } catch (err) {
      console.error("Error inserting youtube video:", err);
    }
    setShowVideoModal(false);
    setVideoError("");
    setYoutubeUrl("");
    setVideoTab("upload");
    setVideoAlign("center");
    setCustomWidth("640");
    setCustomHeight("360");
  };

  return (
    <>
      <div
        className={`rounded-lg border border-gray-200 bg-white shadow-sm ${disabled ? "opacity-90" : ""
          } ${className}`}
      >
        {/* Insert Form, Button, Image, and Video */}
        {isReady && !disabled && !hideAdminTools && (
          <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowVideoModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              type="button"
            >
              <FaVideo className="w-4 h-4" />
              Insert Video
            </button>
            <button
              onClick={() => setShowImageModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              type="button"
            >
              <FaImage className="w-4 h-4" />
              Insert Image
            </button>
            <button
              onClick={() => setShowButtonModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              Insert Button
            </button>
            <button
              onClick={() => setShowFormModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Insert Form
            </button>
            <button
              onClick={openFormLinkModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              type="button"
              title="Select text, then click to make it a link that opens a form modal"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Form link
            </button>
          </div>
        )}

        {!isReady && (
          <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">
            Loading editor...
          </div>
        )}
        <textarea
          id={instanceId}
          ref={textareaRef}
          defaultValue={value}
          style={{ display: isReady ? "none" : "block" }}
          aria-label="Rich text editor"
        />
      </div>

      {/* Form link modal: make selected text a link that opens form modal on click */}
      {showFormLinkModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Form link</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                The selected text will become a clickable link. When users click it, the form modal will open.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link text</label>
                <input
                  type="text"
                  value={formLinkText}
                  onChange={(e) => setFormLinkText(e.target.value)}
                  placeholder="Text for the link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form to open</label>
                <select
                  value={formLinkFormId || ""}
                  onChange={(e) => setFormLinkFormId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                >
                  <option value="">Select a form</option>
                  {forms.map((form) => (
                    <option key={form._id} value={form.formId}>{form.formId}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  After submission go to <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formLinkRedirect}
                  onChange={(e) => setFormLinkRedirect(e.target.value)}
                  placeholder="e.g. /thank-you or https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to just close the modal. Use a path (e.g. /thank-you) or full URL.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFormLinkModal(false);
                  setFormLinkText("");
                  setFormLinkFormId(null);
                  setFormLinkRedirect("");
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertFormLink}
                disabled={!formLinkText.trim() || !formLinkFormId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert link
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Form Selection Modal */}
      {showFormModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          {/* Modal Container */}
          <div className="bg-white rounded shadow w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-40">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Insert Form
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Embed an existing form into your content
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded transition"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-3 flex-1 overflow-y-auto"
            >
              {/* Left Column - Form List */}
              <div className="space-y-2">
                {/* Search */}
                <div className="relative">
                  <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search forms..."
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Form List */}
                <div className="rounded border border-gray-200 overflow-hidden bg-white">
                  {loadingForms ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mb-2"></div>
                        <p className="text-sm text-gray-600">
                          Loading forms...
                        </p>
                      </div>
                    </div>
                  ) : forms.length === 0 ? (
                    <div className="text-center py-6 px-3">
                      <p className="text-sm font-medium text-gray-800 mb-1">
                        No active forms
                      </p>
                      <p className="text-xs text-gray-500">
                        Create a form in Form Management first.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200 max-h-[calc(90vh-280px)] overflow-y-auto">
                      {forms.map((form) => (
                        <li key={form._id}>
                          <button
                            onClick={() => handleFormSelect(form)}
                            className={`w-full text-left p-2 transition-colors ${selectedForm?._id === form._id
                              ? "bg-blue-50 border-l-2 border-blue-600"
                              : "hover:bg-gray-50"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                <code className="text-sm font-mono  px-2 py-0.5 rounded">
                                  {form.formId}
                                </code>
                              </h3>
                              {form.submissionCount > 0 && (
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {form.submissionCount} submission
                                  {form.submissionCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right Column - Form Configuration */}
              <div className="space-y-2">
                {!selectedForm ? (
                  <div className="h-full min-h-[200px] border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-center p-3 bg-gray-50">
                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center mb-2">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Select a form
                    </p>
                    <p className="text-xs text-gray-500">
                      Choose a form from the list to configure and insert it
                      into your content.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Form Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          <code className="text-sm font-mono px-2 py-1 rounded">
                            {selectedForm.formId}
                          </code>
                        </h3>
                        <button
                          onClick={() => setSelectedForm(null)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          ← Change form
                        </button>
                      </div>
                      {selectedForm.submissionCount > 0 && (
                        <span className="text-xs text-gray-500">
                          {selectedForm.submissionCount} submission
                          {selectedForm.submissionCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Preview Card */}
                    <div className="border border-gray-200 rounded overflow-hidden bg-white">
                      <div className="p-4 flex gap-4 items-center">
                        <div className="w-24 h-20 rounded bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white overflow-hidden shrink-0">
                          {insertOptions.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={insertOptions.imageUrl}
                              alt="Form preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-xs font-semibold">FORM</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Description Badge - shown first */}
                          {(insertOptions.description ||
                            selectedForm.description) && (
                              <div className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded inline-block mb-2">
                                {insertOptions.description ||
                                  selectedForm.description}
                              </div>
                            )}
                          {/* Title - shown second */}
                          <h4 className="text-sm font-semibold text-gray-900">
                            {insertOptions.title || selectedForm.formId}
                          </h4>
                          {/* Button Preview */}
                          <div className="mt-3">
                            <span className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md">
                              {insertOptions.buttonText || "Submit"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configuration Fields */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Form Settings
                      </h4>

                      {/* Form Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Form Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={insertOptions.title}
                          onChange={(e) =>
                            setInsertOptions({
                              ...insertOptions,
                              title: e.target.value,
                            })
                          }
                          placeholder="Enter form title"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* Form Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Form Description
                        </label>
                        <textarea
                          value={insertOptions.description}
                          onChange={(e) =>
                            setInsertOptions({
                              ...insertOptions,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter form description (optional)"
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                        />
                      </div>

                      {/* Image URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Image URL
                        </label>
                        <input
                          type="url"
                          value={insertOptions.imageUrl}
                          onChange={(e) =>
                            setInsertOptions({
                              ...insertOptions,
                              imageUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/image.jpg"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Image displayed in the form modal (optional)
                        </p>
                      </div>

                      {/* Button Configuration */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Button Text <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={insertOptions.buttonText}
                            onChange={(e) =>
                              setInsertOptions({
                                ...insertOptions,
                                buttonText: e.target.value,
                              })
                            }
                            placeholder="e.g., Download, Submit"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Button Color{" "}
                            <span className="text-gray-500 text-xs">
                              (optional)
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={insertOptions.buttonColor}
                              onChange={(e) =>
                                setInsertOptions({
                                  ...insertOptions,
                                  buttonColor: e.target.value,
                                })
                              }
                              className="w-12 h-9 border border-gray-300 rounded cursor-pointer"
                              aria-label="Button color"
                            />
                            <input
                              type="text"
                              value={insertOptions.buttonColor}
                              onChange={(e) =>
                                setInsertOptions({
                                  ...insertOptions,
                                  buttonColor: e.target.value,
                                })
                              }
                              placeholder="#2563eb"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Button Link{" "}
                            <span className="text-gray-500 text-xs">
                              (optional)
                            </span>
                          </label>
                          <input
                            type="url"
                            value={insertOptions.buttonLink}
                            onChange={(e) =>
                              setInsertOptions({
                                ...insertOptions,
                                buttonLink: e.target.value,
                              })
                            }
                            placeholder="https://example.com"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowFormModal(false);
                          setSelectedForm(null);
                          setInsertOptions({
                            title: "",
                            description: "",
                            buttonText: "",
                            buttonColor: "#2563eb",
                            buttonLink: "",
                            imageUrl: "",
                          });
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={insertFormCode}
                        disabled={
                          !insertOptions.title.trim() ||
                          !insertOptions.buttonText.trim()
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Insert Form
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showButtonModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Insert Button
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a responsive button with custom text, color, and link
                </p>
              </div>
              <button
                onClick={() => {
                  setShowButtonModal(false);
                  setButtonOptions({
                    text: "",
                    color: "#2563eb",
                    link: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Button Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Button Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={buttonOptions.text}
                  onChange={(e) =>
                    setButtonOptions({ ...buttonOptions, text: e.target.value })
                  }
                  placeholder="e.g., Click Here, Learn More, Download"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Button Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Button Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={buttonOptions.color}
                    onChange={(e) =>
                      setButtonOptions({
                        ...buttonOptions,
                        color: e.target.value,
                      })
                    }
                    className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={buttonOptions.color}
                    onChange={(e) =>
                      setButtonOptions({
                        ...buttonOptions,
                        color: e.target.value,
                      })
                    }
                    placeholder="#2563eb"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Choose a color or enter a hex code
                </p>
              </div>

              {/* Button Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Button Link <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={buttonOptions.link}
                  onChange={(e) =>
                    setButtonOptions({ ...buttonOptions, link: e.target.value })
                  }
                  placeholder="https://example.com or /page"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for a button without link
                </p>
              </div>

              {/* Preview */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                  <div className="w-full max-w-xs">
                    {buttonOptions.text ? (
                      buttonOptions.link ? (
                        <a
                          href={buttonOptions.link}
                          className="inline-block w-full px-4 py-2.5 text-center text-white rounded-lg font-medium transition-all"
                          style={{
                            backgroundColor: buttonOptions.color,
                            boxShadow: `0 2px 4px rgba(${buttonOptions.color === "#2563eb"
                              ? "37, 99, 235"
                              : "0, 0, 0"
                              }, 0.2)`,
                          }}
                          onClick={(e) => e.preventDefault()}
                        >
                          {buttonOptions.text}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="inline-block w-full px-4 py-2.5 text-center text-white rounded-lg font-medium transition-all cursor-default"
                          style={{
                            backgroundColor: buttonOptions.color,
                            boxShadow: `0 2px 4px rgba(${buttonOptions.color === "#2563eb"
                              ? "37, 99, 235"
                              : "0, 0, 0"
                              }, 0.2)`,
                          }}
                          disabled
                        >
                          {buttonOptions.text}
                        </button>
                      )
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        Enter button text to see preview
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowButtonModal(false);
                  setButtonOptions({
                    text: "",
                    color: "#2563eb",
                    link: "",
                  });
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={insertButtonCode}
                disabled={!buttonOptions.text.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                Insert Button
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Upload Modal */}
      {showImageModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Insert Image
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload an image or paste from clipboard
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageError("");
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FaUpload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to select or paste image (Ctrl+V)
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG, JPEG, GIF, WebP (max 10MB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {imageError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{imageError}</p>
                </div>
              )}

              {/* Upload Progress */}
              {uploadingImage && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <FaSpinner className="w-5 h-5 animate-spin text-purple-600" />
                  <span className="text-sm text-gray-600">Uploading image...</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Video Upload/YouTube Modal */}
      {showVideoModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Insert Video
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload a video file or embed from YouTube
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoError("");
                  setYoutubeUrl("");
                  setVideoTab("upload");
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setVideoTab("upload");
                  setVideoError("");
                }}
                className="flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 hover:bg-gray-100"
                style={{
                  borderBottomColor: videoTab === "upload" ? "#ef4444" : "transparent",
                  color: videoTab === "upload" ? "#ef4444" : "#6b7280",
                  backgroundColor: videoTab === "upload" ? "#ffffff" : "transparent",
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaUpload className="w-4 h-4" />
                  Upload Video
                </div>
              </button>
              <button
                onClick={() => {
                  setVideoTab("youtube");
                  setVideoError("");
                }}
                className="flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 hover:bg-gray-100"
                style={{
                  borderBottomColor: videoTab === "youtube" ? "#ef4444" : "transparent",
                  color: videoTab === "youtube" ? "#ef4444" : "#6b7280",
                  backgroundColor: videoTab === "youtube" ? "#ffffff" : "transparent",
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube URL
                </div>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Upload Tab Content */}
              {videoTab === "upload" && (
                <>
                  {/* File Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Video File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                      <input
                        type="file"
                        id="video-upload"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleVideoUpload}
                        className="hidden"
                        disabled={uploadingVideo}
                      />
                      <label
                        htmlFor="video-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <FaVideo className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          Click to select video file
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          MP4, WebM, OGG, MOV (max 100MB)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Video Dimensions & Alignment */}
                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Video Dimensions
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Width (px)
                          </label>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="640"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Height (px)
                          </label>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="360"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alignment
                      </label>
                      <div className="flex bg-gray-100 p-1 rounded-lg w-max">
                        {[
                          { id: "left", icon: <FaAlignLeft /> },
                          { id: "center", icon: <FaAlignCenter /> },
                          { id: "right", icon: <FaAlignRight /> },
                        ].map((align) => (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => setVideoAlign(align.id)}
                            className={`p-2 rounded-md transition-all ${videoAlign === align.id
                              ? "bg-white text-red-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                              }`}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Info Message */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>💡 Tip:</strong> Videos will be embedded as responsive players. The dimensions you set act as the maximum size.
                    </p>
                  </div>
                </>
              )}

              {/* YouTube Tab Content */}
              {videoTab === "youtube" && (
                <>
                  {/* YouTube URL Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Video URL
                    </label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => {
                        setYoutubeUrl(e.target.value);
                        setVideoError("");
                      }}
                      placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/shorts/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Paste any YouTube video URL (watch, shorts, share, or embed link)
                    </p>
                  </div>

                  {/* YouTube Info */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                      <strong>📺 YouTube:</strong> Supports regular videos and YouTube Shorts. The video will be embedded as a responsive iframe with full YouTube player features.
                    </p>
                  </div>

                  {/* Preview */}
                  {youtubeUrl && extractYouTubeId(youtubeUrl) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview
                      </label>
                      <div className="relative" style={{ paddingBottom: `${(parseInt(customHeight) / parseInt(customWidth)) * 100 || 56.25}%`, height: 0, overflow: "hidden", borderRadius: "8px", background: "#000" }}>
                        <iframe
                          className="absolute inset-0 w-full h-full border-none rounded-lg"
                          src={`https://www.youtube.com/embed/${extractYouTubeId(youtubeUrl)}`}
                          title="YouTube video preview"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {/* Dimensions & Alignment */}
                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Video Dimensions
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Width (px)
                          </label>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="640"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Height (px)
                          </label>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="360"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alignment
                      </label>
                      <div className="flex bg-gray-100 p-1 rounded-lg w-max">
                        {[
                          { id: "left", icon: <FaAlignLeft /> },
                          { id: "center", icon: <FaAlignCenter /> },
                          { id: "right", icon: <FaAlignRight /> },
                        ].map((align) => (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => setVideoAlign(align.id)}
                            className={`p-2 rounded-md transition-all ${videoAlign === align.id
                              ? "bg-white text-red-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                              }`}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Error Message */}
              {videoError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{videoError}</p>
                </div>
              )}

              {/* Upload Progress */}
              {uploadingVideo && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <FaSpinner className="w-5 h-5 animate-spin text-red-600" />
                  <span className="text-sm text-gray-600">Uploading video...</span>
                </div>
              )}
            </div>

            {/* Footer */}
            {videoTab === "youtube" && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowVideoModal(false);
                    setVideoError("");
                    setYoutubeUrl("");
                    setVideoTab("upload");
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={insertYouTubeVideo}
                  disabled={!youtubeUrl.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Insert YouTube Video
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default RichTextEditor;
