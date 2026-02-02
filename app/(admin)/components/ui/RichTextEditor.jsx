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

// Shared toolbar style: only remove from document when last RichTextEditor unmounts (avoids toolbar glitch when multiple editors or re-mounts).
let globalToolbarStyleRefCount = 0;
let globalToolbarStyleEl = null;

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
  const [youtubeUrlList, setYoutubeUrlList] = useState([""]); // multiple YouTube URLs
  const [videoTab, setVideoTab] = useState("upload"); // "upload" or "youtube"
  const [videoAlign, setVideoAlign] = useState("center"); // "left", "center", "right"
  const [customWidth, setCustomWidth] = useState("640");
  const [customHeight, setCustomHeight] = useState("360");
  const [videoGridColumns, setVideoGridColumns] = useState("auto"); // "auto" | "2" | "3"
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const placeholderRef = useRef(placeholder);
  /** After we emit onChange (e.g. when leaving Source mode), skip one value→editor sync so we don't overwrite with stale parent value */
  const lastEmittedDataRef = useRef(null);
  /** Interval for syncing source textarea to parent while in source mode (so Save works without switching back) */
  const sourceSyncIntervalRef = useRef(null);
  /** Last raw source we pushed, to avoid duplicate onChange while in source mode */
  const lastSourcePushRef = useRef(null);
  /** Refs for custom toolbar buttons so CKEditor commands can open our modals (always current) */
  const openVideoModalRef = useRef(null);
  const openImageModalRef = useRef(null);
  const openButtonModalRef = useRef(null);
  const openFormModalRef = useRef(null);
  const openFormLinkModalRef = useRef(null);
  const customToolbarStyleRef = useRef(null);

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

  // Keep insert-modal callbacks current so CKEditor toolbar commands can open modals
  useEffect(() => {
    openVideoModalRef.current = () => setShowVideoModal(true);
    openImageModalRef.current = () => setShowImageModal(true);
    openButtonModalRef.current = () => setShowButtonModal(true);
    openFormModalRef.current = () => setShowFormModal(true);
    openFormLinkModalRef.current = openFormLinkModal;
  });

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

  // Icon base URL for toolbar (file-based so CKEditor and CSS always load them)
  const RTE_ICON_BASE = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${basePath}/icons`;
  }, []);

  const RTE_ICON_URLS = useMemo(
    () => ({
      video: `${RTE_ICON_BASE}/rte-video.svg`,
      image: `${RTE_ICON_BASE}/rte-image.svg`,
      button: `${RTE_ICON_BASE}/rte-button.svg`,
      form: `${RTE_ICON_BASE}/rte-form.svg`,
      formLink: `${RTE_ICON_BASE}/rte-formlink.svg`,
    }),
    [RTE_ICON_BASE]
  );

  const toolbarConfig = useMemo(
    () => {
      const base = [
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
      ];
      if (hideAdminTools) return base;
      return [
        ...base.slice(0, base.findIndex((g) => g.name === "insert") + 1),
        {
          name: "insertCustom",
          items: [
            "RTEInsertVideo",
            "RTEInsertImage",
            "RTEInsertButton",
            "RTEInsertForm",
            "RTEFormLink",
          ],
        },
        ...base.slice(base.findIndex((g) => g.name === "insert") + 1),
      ];
    },
    [hideAdminTools]
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

      const iconUrls = RTE_ICON_URLS;
      if (!CKEDITOR.plugins.registered.rteInsertTools) {
        CKEDITOR.plugins.add("rteInsertTools", {
          init(editor) {
            editor.addCommand("RTEInsertVideo", {
              exec(edt) {
                edt._openVideoModal?.();
              },
            });
            editor.addCommand("RTEInsertImage", {
              exec(edt) {
                edt._openImageModal?.();
              },
            });
            editor.addCommand("RTEInsertButton", {
              exec(edt) {
                edt._openButtonModal?.();
              },
            });
            editor.addCommand("RTEInsertForm", {
              exec(edt) {
                edt._openFormModal?.();
              },
            });
            editor.addCommand("RTEFormLink", {
              exec(edt) {
                edt._openFormLinkModal?.();
              },
            });
            editor.ui.addButton("RTEInsertVideo", {
              label: "Insert Video",
              command: "RTEInsertVideo",
              toolbar: "insertCustom",
              icon: iconUrls.video,
            });
            editor.ui.addButton("RTEInsertImage", {
              label: "Insert Image",
              command: "RTEInsertImage",
              toolbar: "insertCustom",
              icon: iconUrls.image,
            });
            editor.ui.addButton("RTEInsertButton", {
              label: "Insert Button",
              command: "RTEInsertButton",
              toolbar: "insertCustom",
              icon: iconUrls.button,
            });
            editor.ui.addButton("RTEInsertForm", {
              label: "Insert Form",
              command: "RTEInsertForm",
              toolbar: "insertCustom",
              icon: iconUrls.form,
            });
            editor.ui.addButton("RTEFormLink", {
              label: "Form link",
              command: "RTEFormLink",
              toolbar: "insertCustom",
              icon: iconUrls.formLink,
            });
          },
        });
      }

      const extraPluginsList = [
        "mathjax",
        "colorbutton",
        "colordialog",
        "justify",
        "font",
        "clipboard",
        "smiley",
      ];
      if (!hideAdminTools) extraPluginsList.push("rteInsertTools");

      const editor = CKEDITOR.replace(textareaRef.current, {
        height: 420,
        removePlugins: "resize",
        extraPlugins: extraPluginsList.join(","),
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
        if (!hideAdminTools) {
          editor._openVideoModal = () => openVideoModalRef.current?.();
          editor._openImageModal = () => openImageModalRef.current?.();
          editor._openButtonModal = () => openButtonModalRef.current?.();
          editor._openFormModal = () => openFormModalRef.current?.();
          editor._openFormLinkModal = () => openFormLinkModalRef.current?.();
        }
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
        lastEmittedDataRef.current = data;
        onChangeRef.current?.(data);
      });

      // When leaving Source mode, CKEditor updates content but "change" may not fire — sync to parent and mark emitted so value effect doesn't overwrite
      // While in Source mode, periodically push source textarea content so Save works without having to click back to WYSIWYG
      editor.on("mode", () => {
        if (editor.mode === "wysiwyg") {
          if (sourceSyncIntervalRef.current) {
            clearInterval(sourceSyncIntervalRef.current);
            sourceSyncIntervalRef.current = null;
          }
          lastSourcePushRef.current = null;
          const data = editor.getData();
          lastEmittedDataRef.current = data;
          onChangeRef.current?.(data);
        } else if (editor.mode === "source") {
          lastSourcePushRef.current = null;
          const pushSourceToParent = () => {
            try {
              const editable = editor.editable();
              if (!editable || editor.mode !== "source") return;
              const raw = typeof editable.getValue === "function" ? editable.getValue() : (editable.$ && editable.$.value);
              if (raw == null) return;
              if (lastSourcePushRef.current === raw) return;
              lastSourcePushRef.current = raw;
              lastEmittedDataRef.current = raw;
              onChangeRef.current?.(raw);
            } catch (e) {
              // ignore if editable not ready
            }
          };
          pushSourceToParent();
          sourceSyncIntervalRef.current = setInterval(pushSourceToParent, 350);
        }
      });
    };

    initializeEditor().catch((error) => {
      console.error("Failed to initialize CKEditor", error);
    });

    return () => {
      isMounted = false;
      if (sourceSyncIntervalRef.current) {
        clearInterval(sourceSyncIntervalRef.current);
        sourceSyncIntervalRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.destroy(true);
        editorRef.current = null;
      }
    };
  }, [toolbarConfig, instanceId, disabled, hideAdminTools, RTE_ICON_URLS]);

  // Inject CSS so custom toolbar buttons show icon + label (file URLs so they always load).
  // Global style is ref-counted so it's only removed when the last RichTextEditor unmounts (prevents toolbar glitch when multiple editors or re-mounts).
  useEffect(() => {
    if (!isReady || hideAdminTools || !RTE_ICON_BASE) return;
    const esc = (s) => (s || "").replace(/(["\\])/g, "\\$1");
    const ic = RTE_ICON_URLS;
    const labelSel = (name) => `.cke_button_${name} .cke_label`;
    const btnSel = (name) => `.cke_button_${name}`;
    const css = `
      /* Icon + label on the button element so it always shows */
      ${btnSel("RTEInsertVideo")} { background-image: url("${esc(ic.video)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 82px !important; }
      ${btnSel("RTEInsertImage")} { background-image: url("${esc(ic.image)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 82px !important; }
      ${btnSel("RTEInsertButton")} { background-image: url("${esc(ic.button)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 82px !important; }
      ${btnSel("RTEInsertForm")} { background-image: url("${esc(ic.form)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 82px !important; }
      ${btnSel("RTEFormLink")} { background-image: url("${esc(ic.formLink)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 82px !important; }
      /* Hide empty icon span so only our button background + label show */
      ${btnSel("RTEInsertVideo")} .cke_icon, ${btnSel("RTEInsertVideo")} .cke_button_icon, .cke_button_RTEInsertVideo_icon,
      ${btnSel("RTEInsertImage")} .cke_icon, ${btnSel("RTEInsertImage")} .cke_button_icon, .cke_button_RTEInsertImage_icon,
      ${btnSel("RTEInsertButton")} .cke_icon, ${btnSel("RTEInsertButton")} .cke_button_icon, .cke_button_RTEInsertButton_icon,
      ${btnSel("RTEInsertForm")} .cke_icon, ${btnSel("RTEInsertForm")} .cke_button_icon, .cke_button_RTEInsertForm_icon,
      ${btnSel("RTEFormLink")} .cke_icon, ${btnSel("RTEFormLink")} .cke_button_icon, .cke_button_RTEFormLink_icon { background: none !important; width: 0 !important; min-width: 0 !important; overflow: hidden !important; padding: 0 !important; }
      /* Always show label text */
      ${labelSel("RTEInsertVideo")}, ${labelSel("RTEInsertImage")}, ${labelSel("RTEInsertButton")}, ${labelSel("RTEInsertForm")}, ${labelSel("RTEFormLink")} { display: inline !important; visibility: visible !important; }
    `;
    const injectGlobal = () => {
      if (globalToolbarStyleEl && globalToolbarStyleEl.parentNode) return;
      const el = document.createElement("style");
      el.setAttribute("data-rte-custom-toolbar", "true");
      el.textContent = css;
      document.head.appendChild(el);
      globalToolbarStyleEl = el;
    };
    const inject = () => {
      globalToolbarStyleRefCount += 1;
      injectGlobal();
      customToolbarStyleRef.current = globalToolbarStyleEl;
      const editor = editorRef.current;
      if (editor?.container?.$ && !editor.container.$.querySelector("style[data-rte-custom-toolbar='inline']")) {
        const el2 = document.createElement("style");
        el2.setAttribute("data-rte-custom-toolbar", "inline");
        el2.textContent = css;
        editor.container.$.appendChild(el2);
      }
    };
    inject();
    const t = setTimeout(() => {
      if (!globalToolbarStyleEl?.parentNode) injectGlobal();
    }, 150);
    const t2 = setTimeout(() => {
      if (!globalToolbarStyleEl?.parentNode) injectGlobal();
    }, 500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      globalToolbarStyleRefCount = Math.max(0, globalToolbarStyleRefCount - 1);
      if (globalToolbarStyleRefCount === 0 && globalToolbarStyleEl?.parentNode) {
        globalToolbarStyleEl.remove();
        globalToolbarStyleEl = null;
      }
      customToolbarStyleRef.current = null;
      const editor = editorRef.current;
      if (editor?.container?.$) {
        editor.container.$.querySelectorAll("style[data-rte-custom-toolbar='inline']").forEach((n) => n.remove());
      }
    };
  }, [isReady, hideAdminTools, RTE_ICON_BASE, RTE_ICON_URLS]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentData = editor.getData();
    if (value === currentData) {
      lastEmittedDataRef.current = null;
      return;
    }
    if (value !== undefined && value !== currentData) {
      if (lastEmittedDataRef.current != null) {
        return;
      }
      editor.setData(value || "");
      lastEmittedDataRef.current = value;
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

  // Handle video upload (single or multiple files)
  const handleVideoUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    const maxSize = 100 * 1024 * 1024;
    const files = Array.from(fileList);

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setVideoError(`Invalid file type: ${file.name}. Only MP4, WebM, OGG, and MOV are allowed.`);
        return;
      }
      if (file.size > maxSize) {
        setVideoError(`File too large: ${file.name}. Max 100MB.`);
        return;
      }
    }

    await uploadMultipleAndInsertVideo(files);
    e.target.value = "";
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

  // Grid columns: responsive and respect user width; 2/3 col use equal fr, auto uses minmax
  const getGridColumnsStyle = (userWidth) => {
    const w = Math.max(160, Math.min(1920, userWidth || 640));
    if (videoGridColumns === "2") return "repeat(2, minmax(0, 1fr))";
    if (videoGridColumns === "3") return "repeat(3, minmax(0, 1fr))";
    return `repeat(auto-fill, minmax(min(100%, ${w}px), 1fr))`;
  };

  const getGridColsClass = () => {
    if (videoGridColumns === "2") return "video-grid-cols-2";
    if (videoGridColumns === "3") return "video-grid-cols-3";
    return "video-grid-cols-auto";
  };

  // Build one video block HTML (upload or youtube) for grid cell; dims.w/dims.h set aspect ratio
  const buildOneVideoBlock = (dims, videoUrl, type = "upload", mimeType = "video/mp4") => {
    const aspectPct = dims.w && dims.h ? (dims.h / dims.w) * 100 : 56.25;
    const containerStyle = `display: block; position: relative; width: 100%; height: 0; padding-bottom: ${aspectPct}%; max-width: 100%; cursor: pointer; border-radius: 8px; overflow: hidden; background: #000; box-sizing: border-box;`;
    const overlayStyle = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); z-index: 10; pointer-events: none;";
    const playBtnStyle = "width: 60px; height: 60px; background: rgba(239, 68, 68, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);";
    const arrowStyle = "width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 20px solid white; margin-left: 5px;";
    const innerStyle = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; background: #000; pointer-events: none; display: block;";

    if (type === "youtube") {
      const embedUrl = videoUrl.startsWith("http") ? videoUrl : `https://www.youtube.com/embed/${videoUrl}`;
      const iframeStyle = innerStyle + " border: none;";
      return `<span class="video-container" data-video-url="${embedUrl}" data-video-type="youtube" style="${containerStyle}"><span class="video-play-overlay" style="${overlayStyle}"><span style="${playBtnStyle}"><span style="${arrowStyle}"></span></span></span><iframe style="${iframeStyle}" src="${embedUrl}?controls=0&showinfo=0&rel=0&modestbranding=1" title="YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></span>`;
    }
    return `<span class="video-container" data-video-url="${videoUrl}" data-video-type="upload" data-mime-type="${mimeType}" style="${containerStyle}"><span class="video-play-overlay" style="${overlayStyle}"><span style="${playBtnStyle}"><span style="${arrowStyle}"></span></span></span><video style="${innerStyle}" preload="metadata"><source src="${videoUrl}" type="${mimeType}" />Your browser does not support the video tag.</video></span>`;
  };

  // Build full grid HTML and insert into editor; width/height/alignment and auto/2/3 col work on frontend
  const insertVideoGrid = (items) => {
    if (!items.length) return;
    const editor = editorRef.current;
    if (!editor) return;
    const dims = getVideoDimensions();
    const w = dims.w || 640;
    const h = dims.h || 360;
    const justify = videoAlign === "left" ? "flex-start" : videoAlign === "right" ? "flex-end" : "center";
    const outerStyle = `display: flex; justify-content: ${justify}; margin: 20px 0; width: 100%; box-sizing: border-box;`;
    const gridStyle = `display: grid; grid-template-columns: ${getGridColumnsStyle(w)}; gap: 1rem; width: 100%; max-width: 100%; margin: 0; align-items: start; box-sizing: border-box;`;
    const colsClass = getGridColsClass();
    const cells = items.map((item) => {
      const block = buildOneVideoBlock(dims, item.url, item.type, item.mimeType);
      return `<div class="video-parent-container" style="width: 100%; min-width: 0; max-width: ${w}px; box-sizing: border-box;">${block}</div>`;
    }).join("");
    const gridHtml = `<div class="video-grid-container" data-video-width="${w}" data-video-height="${h}" data-video-align="${videoAlign}" style="${outerStyle}"><div class="video-grid-inner ${colsClass}" style="${gridStyle}">${cells}</div></div>`;
    editor.focus();
    editor.insertHtml(gridHtml);
  };

  // Upload multiple videos and insert as grid
  const uploadMultipleAndInsertVideo = async (files) => {
    if (!files?.length) return;
    try {
      setUploadingVideo(true);
      setVideoError("");
      const items = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("video", file);
        if (examId) formData.append("examId", examId);
        if (subjectId) formData.append("subjectId", subjectId);
        if (unitId) formData.append("unitId", unitId);
        if (chapterId) formData.append("chapterId", chapterId);
        if (topicId) formData.append("topicId", topicId);
        if (subtopicId) formData.append("subtopicId", subtopicId);
        if (definitionId) formData.append("definitionId", definitionId);

        const response = await api.post("/upload/video", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data?.success && response.data?.data?.url) {
          items.push({ url: response.data.data.url, type: "upload", mimeType: file.type });
        } else {
          setVideoError(response.data?.message || "Failed to upload one or more videos.");
          setUploadingVideo(false);
          return;
        }
      }

      if (items.length) {
        insertVideoGrid(items);
        setShowVideoModal(false);
        setVideoError("");
        setYoutubeUrl("");
        setYoutubeUrlList([""]);
        setVideoTab("upload");
        setVideoAlign("center");
        setCustomWidth("640");
        setCustomHeight("360");
        setVideoGridColumns("auto");
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

  // Insert one or more YouTube videos as grid
  const insertYouTubeVideos = () => {
    const urls = youtubeUrlList.filter((u) => u?.trim());
    if (!urls.length) {
      setVideoError("Add at least one YouTube URL.");
      return;
    }

    const ids = [];
    for (const url of urls) {
      const id = extractYouTubeId(url);
      if (!id) {
        setVideoError(`Invalid YouTube URL: "${url.slice(0, 50)}...". Use watch, shorts, or youtu.be links.`);
        return;
      }
      ids.push(id);
    }

    const items = ids.map((id) => ({
      url: `https://www.youtube.com/embed/${id}`,
      type: "youtube",
      mimeType: "",
    }));
    insertVideoGrid(items);

    setShowVideoModal(false);
    setVideoError("");
    setYoutubeUrl("");
    setYoutubeUrlList([""]);
    setVideoTab("upload");
    setVideoAlign("center");
    setCustomWidth("640");
    setCustomHeight("360");
    setVideoGridColumns("auto");
  };

  const addYoutubeUrlRow = () => setYoutubeUrlList((prev) => [...prev, ""]);
  const removeYoutubeUrlRow = (index) =>
    setYoutubeUrlList((prev) => prev.filter((_, i) => i !== index));
  const setYoutubeUrlAt = (index, value) =>
    setYoutubeUrlList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  return (
    <>
      <div
        className={`rounded-lg border border-gray-200 bg-white shadow-sm ${disabled ? "opacity-90" : ""
          } ${className}`}
      >
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
                  setYoutubeUrlList([""]);
                  setVideoTab("upload");
                  setVideoGridColumns("auto");
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
                  {/* File Input - multiple */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Video File(s)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                      <input
                        type="file"
                        id="video-upload"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        multiple
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
                          Click to select one or more videos
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          MP4, WebM, OGG, MOV (max 100MB each)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Grid columns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grid layout
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "auto", label: "Auto (responsive)" },
                        { id: "2", label: "2 columns" },
                        { id: "3", label: "3 columns" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setVideoGridColumns(opt.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${videoGridColumns === opt.id ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
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
                      <strong>💡 Tip:</strong> Select multiple files to insert several videos at once. They will appear in a responsive grid. Width and height set the size of each video.
                    </p>
                  </div>
                </>
              )}

              {/* YouTube Tab Content */}
              {videoTab === "youtube" && (
                <>
                  {/* Multiple YouTube URLs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Video URL(s)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Add one or more URLs (watch, Shorts, or youtu.be). They will be inserted in a responsive grid.
                    </p>
                    <div className="space-y-2">
                      {youtubeUrlList.map((url, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                              setYoutubeUrlAt(index, e.target.value);
                              setVideoError("");
                            }}
                            placeholder="https://www.youtube.com/watch?v=... or youtube.com/shorts/..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeYoutubeUrlRow(index)}
                            disabled={youtubeUrlList.length <= 1}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Remove URL"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addYoutubeUrlRow}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      + Add another URL
                    </button>
                  </div>

                  {/* Grid columns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grid layout
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "auto", label: "Auto (responsive)" },
                        { id: "2", label: "2 columns" },
                        { id: "3", label: "3 columns" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setVideoGridColumns(opt.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${videoGridColumns === opt.id ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* YouTube Info */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                      <strong>📺 YouTube:</strong> Supports regular videos and Shorts. Multiple videos are inserted in a responsive grid with the height you set below.
                    </p>
                  </div>

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
                    setYoutubeUrlList([""]);
                    setVideoTab("upload");
                    setVideoGridColumns("auto");
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={insertYouTubeVideos}
                  disabled={!youtubeUrlList.some((u) => u?.trim())}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Insert YouTube Video(s)
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
