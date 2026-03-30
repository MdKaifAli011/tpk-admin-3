"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaSearch, FaImage, FaUpload, FaSpinner, FaVideo, FaAlignLeft, FaAlignCenter, FaAlignRight, FaFolderOpen, FaCopy, FaChevronLeft, FaChevronRight, FaFile, FaFileAlt } from "react-icons/fa";
import api from "@/lib/api";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const CKEDITOR_SCRIPT = `${basePath}/vendor/ckeditor/ckeditor.js`;
const MATHJAX_SCRIPT = `${basePath}/vendor/mathjax/MathJax.js?config=TeX-AMS_HTML`;
const CKEDITOR_CONTENTS_CSS = `${basePath}/vendor/ckeditor/contents.css`;
/** Matches RichContent: public/commanStyle.css (served via /api/richtext-common-css for CKEditor iframe) */
const RICHTEXT_COMMON_CSS = `${basePath}/api/richtext-common-css`;
let cachedRichtextCssHref = null;

async function getRichtextCommonCssHref() {
  if (cachedRichtextCssHref) return cachedRichtextCssHref;
  try {
    const res = await fetch(`${basePath}/api/richtext-common-css-version`, {
      cache: "no-store",
    });
    const payload = await res.json();
    const version = payload?.data?.version;
    if (version) {
      cachedRichtextCssHref = `${RICHTEXT_COMMON_CSS}?v=${encodeURIComponent(version)}`;
      return cachedRichtextCssHref;
    }
  } catch {
    // fallback below
  }
  cachedRichtextCssHref = RICHTEXT_COMMON_CSS;
  return cachedRichtextCssHref;
}

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
  /** Optional custom image upload (e.g. discussion forum). (file: File) => Promise<{ url: string, filename?: string }> */
  onImageUpload = null,
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
  const [showContactFormModal, setShowContactFormModal] = useState(false);
  const [contactFormOptions, setContactFormOptions] = useState({
    formId: "",
    title: "",
    description: "",
    imageUrl: "",
    buttonText: "",
  });
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageLayout, setImageLayout] = useState("1"); // "1" | "2" | "3"
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [imageAlign, setImageAlign] = useState("center"); // "left" | "center" | "right" — only for 1 col
  const [imageInsertSource, setImageInsertSource] = useState("upload"); // "upload" | "url" | "media"
  const [imageUrl, setImageUrl] = useState("");
  const [imageAltText, setImageAltText] = useState("");
  const [imageUrlList, setImageUrlList] = useState([{ url: "", altText: "" }]); // multiple URLs
  const [pastedImagePreviews, setPastedImagePreviews] = useState([]); // legacy, kept for cleanup
  const [uploadImageSlots, setUploadImageSlots] = useState([null]); // [ null | { file, previewUrl }, ... ] length = 1, 2, or 3 by imageLayout
  const [imageMediaPickerFolder, setImageMediaPickerFolder] = useState("");
  const [imageMediaPickerItems, setImageMediaPickerItems] = useState([]);
  const [imageMediaPickerLoading, setImageMediaPickerLoading] = useState(false);
  const [imageMediaPickerSelected, setImageMediaPickerSelected] = useState(new Set()); // ids
  const [imageMediaPickerFolders, setImageMediaPickerFolders] = useState({ folders: [], tree: [] });
  const [imageMediaPickerFullScreen, setImageMediaPickerFullScreen] = useState(null); // { url, altText, name } | null
  const [imageMediaPickerCopyUrlToast, setImageMediaPickerCopyUrlToast] = useState(false);
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
  const openContactFormModalRef = useRef(null);
  const openMediaLibraryModalRef = useRef(null);
  const contactFormEditingElementRef = useRef(null);
  const customToolbarStyleRef = useRef(null);
  const imageModalFocusRef = useRef(null);
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;

  const [showMediaLibraryModal, setShowMediaLibraryModal] = useState(false);
  const [mediaLibraryItems, setMediaLibraryItems] = useState([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [mediaLibraryPage, setMediaLibraryPage] = useState(1);
  const [mediaLibraryTotalPages, setMediaLibraryTotalPages] = useState(0);
  const [mediaLibraryType, setMediaLibraryType] = useState("image");
  const [mediaLibrarySearch, setMediaLibrarySearch] = useState("");
  const [mediaLibraryCopyToast, setMediaLibraryCopyToast] = useState(null);

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
    openImageModalRef.current = () => {
      const editor = editorRef.current;
      if (editor?.focusManager) editor.focusManager.blur();
      setImageInsertSource("upload");
      setImageUrl("");
      setImageAltText("");
      setImageUrlList([{ url: "", altText: "" }]);
      setPastedImagePreviews((prev) => {
        prev.forEach((p) => { try { URL.revokeObjectURL(p.previewUrl); } catch (_) {} });
        return [];
      });
      setUploadImageSlots((prev) => {
        const N = Math.min(3, Math.max(1, parseInt(imageLayout, 10) || 1));
        prev.forEach((s) => { if (s?.previewUrl) try { URL.revokeObjectURL(s.previewUrl); } catch (_) {} });
        return Array(N).fill(null);
      });
      setShowImageModal(true);
    };
    openButtonModalRef.current = () => setShowButtonModal(true);
    openFormModalRef.current = () => setShowFormModal(true);
    openFormLinkModalRef.current = openFormLinkModal;
    openContactFormModalRef.current = () => setShowContactFormModal(true);
    openMediaLibraryModalRef.current = () => {
      const editor = editorRef.current;
      if (editor?.focusManager) editor.focusManager.blur();
      setShowMediaLibraryModal(true);
      setMediaLibraryPage(1);
      setMediaLibrarySearch("");
    };
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
      mediaLibrary: `${RTE_ICON_BASE}/rte-filemanager.svg`,
      button: `${RTE_ICON_BASE}/rte-button.svg`,
      form: `${RTE_ICON_BASE}/rte-form.svg`,
      contactForm: `${RTE_ICON_BASE}/rte-contact-form.svg`,
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
      // User side with onImageUpload: use only default CKEditor "Image" (no custom insert button)
      if (hideAdminTools) return base;
      const insertGroup = {
        name: "insertCustom",
        items: [
          "RTEInsertVideo",
          "RTEInsertImage",
          "RTEMediaLibrary",
          "RTEInsertButton",
          "RTEInsertForm",
          "RTEInsertContactForm",
          "RTEFormLink",
        ],
      };
      return [
        ...base.slice(0, base.findIndex((g) => g.name === "insert") + 1),
        insertGroup,
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
            editor.addCommand("RTEInsertContactForm", {
              exec(edt) {
                edt._openContactFormModal?.();
              },
            });
            editor.addCommand("RTEMediaLibrary", {
              exec(edt) {
                edt._openMediaLibraryModal?.();
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
            editor.ui.addButton("RTEInsertContactForm", {
              label: "Contact Form",
              command: "RTEInsertContactForm",
              toolbar: "insertCustom",
              icon: iconUrls.contactForm,
            });
            editor.ui.addButton("RTEMediaLibrary", {
              label: "Media Library",
              command: "RTEMediaLibrary",
              toolbar: "insertCustom",
              icon: iconUrls.mediaLibrary,
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

      // Use stable versioned CSS URL for high cache hit-rate with instant invalidation.
      const runtimeRichtextCommonCss = await getRichtextCommonCssHref();

      const editorConfig = {
        height: 420,
        removePlugins: "resize",
        extraPlugins: extraPluginsList.join(","),
        mathJaxLib: MATHJAX_SCRIPT,
        contentsCss: [CKEDITOR_CONTENTS_CSS, runtimeRichtextCommonCss],
        bodyClass: "rich-text-content rich-html-common",
        autoParagraph: true,
        ignoreEmptyParagraph: true,
        allowedContent: true,
        placeholder: placeholderRef.current,
        readOnly: false,
        toolbar: toolbarConfig,
      };
      if (onImageUploadRef.current) {
        editorConfig.clipboard_handleImages = false;
      }
      const editor = CKEDITOR.replace(textareaRef.current, editorConfig);

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
          editor._openContactFormModal = () => {
            contactFormEditingElementRef.current = null;
            openContactFormModalRef.current?.();
          };
          editor._openMediaLibraryModal = () => openMediaLibraryModalRef.current?.();
        }
        if (valueRef.current) {
          editor.setData(valueRef.current);
        }
        if (disabled) {
          editor.setReadOnly(true);
        }
        editor.fire("change");

        // Inject image grid CSS into editor content so 2-col/3-col layouts display correctly in the editor
        try {
          const doc = editor.document;
          const head = doc && doc.getHead && doc.getHead();
          if (head) {
            const style = new CKEDITOR.dom.element("style");
            style.setAttribute("type", "text/css");
            const cssText =
              ".image-insert-wrapper{display:grid;gap:0.75rem 1rem;margin:1rem 0;align-items:start;width:100%;box-sizing:border-box}" +
              ".image-insert-wrapper .image-grid-cell{min-width:0;box-sizing:border-box}" +
              ".image-insert-wrapper img{max-width:100%;width:100%;height:auto;display:block;border-radius:6px;box-sizing:border-box}" +
              ".image-grid-cols-1{grid-template-columns:1fr}" +
              ".image-grid-cols-2{grid-template-columns:1fr}" +
              "@media (min-width:768px){.image-grid-cols-2{grid-template-columns:repeat(2,1fr)}}" +
              ".image-grid-cols-3{grid-template-columns:1fr}" +
              "@media (min-width:640px){.image-grid-cols-3{grid-template-columns:repeat(2,1fr)}}" +
              "@media (min-width:1024px){.image-grid-cols-3{grid-template-columns:repeat(3,1fr)}}" +
              ".image-insert-wrapper.image-align-left{width:fit-content;margin-left:0;margin-right:auto}" +
              ".image-insert-wrapper.image-align-center{width:fit-content;margin-left:auto;margin-right:auto}" +
              ".image-insert-wrapper.image-align-right{width:fit-content;margin-left:auto;margin-right:0}";
            if (style.$) {
              style.$.textContent = cssText;
            } else {
              style.setHtml(cssText);
            }
            head.append(style);
          }
        } catch (err) {
          console.warn("Could not inject image grid CSS into editor:", err);
        }

        // User-side only: when onImageUpload is provided, intercept paste/drop so images upload to public/asset/user/... and DB (priority 0 = before CKEditor's default)
        const customUpload = onImageUploadRef.current;
        if (customUpload && typeof customUpload === "function") {
          const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
          const uploadOneAndInsert = (file) => {
            if (!file || !ALLOWED.includes(file.type)) return;
            compressImageIfNeeded(file).then((fileToUpload) => {
              if (!fileToUpload) return;
              customUpload(fileToUpload)
                .then((res) => {
                  const url = res?.url;
                  if (!url) return;
                  const alt = (res?.filename || file.name || "image").replace(/"/g, "&quot;");
                  const safeUrl = String(url).replace(/"/g, "&quot;");
                  editor.insertHtml(`<img src="${safeUrl}" alt="${alt}" style="max-width:100%;height:auto;" loading="lazy" />`);
                })
                .catch((err) => {
                  console.warn("Discussion image upload failed:", err);
                });
            });
          };
          // Editor-level paste: run before CKEditor's image handler (priority 1) so we can cancel and upload.
          // At priority 0 dataTransfer may not be set yet; use native event clipboardData.files as fallback.
          editor.on("paste", (evt) => {
            const data = evt.data;
            if (data.dataValue) return; // already has HTML, let default run
            let file = null;
            const dt = data.dataTransfer;
            if (dt && typeof dt.getFilesCount === "function") {
              for (let i = 0; i < dt.getFilesCount(); i++) {
                const f = dt.getFile(i);
                if (f && f.type && ALLOWED.includes(f.type)) {
                  file = f;
                  break;
                }
              }
            }
            if (!file && data.$ && data.$.clipboardData && data.$.clipboardData.files) {
              const files = data.$.clipboardData.files;
              for (let i = 0; i < files.length; i++) {
                if (files[i].type && ALLOWED.includes(files[i].type)) {
                  file = files[i];
                  break;
                }
              }
            }
            if (file) {
              if (data.$ && data.$.preventDefault) data.$.preventDefault();
              evt.cancel();
              evt.stop();
              uploadOneAndInsert(file);
            }
          }, null, null, 0);
          // Drop: listen on contentDom so we get drop on the editable; intercept files and upload
          editor.on("contentDom", () => {
            const editable = editor.editable();
            if (!editable || !editable.attachListener) return;
            editable.attachListener(editable, "drop", (evt) => {
              const raw = evt.data.$;
              const files = raw?.dataTransfer?.files;
              if (!files || !files.length) return;
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type && ALLOWED.includes(file.type)) {
                  if (raw.preventDefault) raw.preventDefault();
                  evt.cancel();
                  uploadOneAndInsert(file);
                  return;
                }
              }
            }, null, null, 0);
          });
          // Image dialog: when user enters/pastes a data: URL, upload it then insert with stored URL
          CKEDITOR.on("dialogDefinition", function dialogDefinitionHandler(evt) {
            if (evt.data.name !== "image" || evt.editor !== editor) return;
            const def = evt.data.definition;
            const originalOnOk = def.onOk;
            def.onOk = function () {
              const dialog = this;
              const url = (dialog.getValueOf("info", "txtUrl") || "").trim();
              if (url && url.toLowerCase().substring(0, 5) === "data:") {
                fetch(url)
                  .then((r) => r.blob())
                  .then((blob) => {
                    const mime = blob.type || "image/png";
                    const ext = mime.split("/")[1] === "jpeg" ? "jpg" : (mime.split("/")[1] || "png");
                    return new File([blob], `image.${ext}`, { type: mime });
                  })
                  .then((file) => (ALLOWED.includes(file.type) ? customUpload(file) : Promise.reject(new Error("Unsupported type"))))
                  .then((res) => {
                    const newUrl = res?.url;
                    if (newUrl && dialog.getContentElement("info", "txtUrl")) {
                      dialog.getContentElement("info", "txtUrl").setValue(newUrl);
                    }
                    originalOnOk.call(dialog);
                  })
                  .catch(() => {
                    originalOnOk.call(dialog);
                  });
                return;
              }
              originalOnOk.call(this);
            };
          });
        }

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
            } else {
              // Click on contact form inline block (div) — open Contact Form modal to edit
              let contactFormDiv = element;
              while (contactFormDiv && contactFormDiv.getParent) {
                const name = contactFormDiv.getName ? contactFormDiv.getName() : "";
                const hasClass = contactFormDiv.hasClass ? contactFormDiv.hasClass("contact-form-inline") : false;
                if (name === "div" && hasClass) break;
                contactFormDiv = contactFormDiv.getParent();
              }
              if (contactFormDiv && contactFormDiv.hasClass && contactFormDiv.hasClass("contact-form-inline")) {
                const formId = contactFormDiv.getAttribute("data-form-id") || "";
                const title = contactFormDiv.getAttribute("data-title") || "";
                const description = contactFormDiv.getAttribute("data-description") || "";
                const imageUrl = contactFormDiv.getAttribute("data-image-url") || "";
                setContactFormOptions({
                  formId: formId.trim(),
                  title: title.trim(),
                  description: description.trim(),
                  imageUrl: imageUrl.trim(),
                  buttonText: (contactFormDiv.getAttribute("data-button-text") || "").trim(),
                });
                contactFormEditingElementRef.current = contactFormDiv;
                setShowContactFormModal(true);
                evt.data.preventDefault();
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
      ${btnSel("RTEInsertContactForm")} { background-image: url("${esc(ic.contactForm)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 98px !important; }
      ${btnSel("RTEMediaLibrary")} { background-image: url("${esc(ic.mediaLibrary)}") !important; background-repeat: no-repeat !important; background-position: 6px center !important; background-size: 16px 16px !important; padding-left: 26px !important; min-width: 82px !important; }
      /* Hide empty icon span so only our button background + label show */
      ${btnSel("RTEInsertVideo")} .cke_icon, ${btnSel("RTEInsertVideo")} .cke_button_icon, .cke_button_RTEInsertVideo_icon,
      ${btnSel("RTEInsertImage")} .cke_icon, ${btnSel("RTEInsertImage")} .cke_button_icon, .cke_button_RTEInsertImage_icon,
      ${btnSel("RTEMediaLibrary")} .cke_icon, ${btnSel("RTEMediaLibrary")} .cke_button_icon, .cke_button_RTEMediaLibrary_icon,
      ${btnSel("RTEInsertButton")} .cke_icon, ${btnSel("RTEInsertButton")} .cke_button_icon, .cke_button_RTEInsertButton_icon,
      ${btnSel("RTEInsertForm")} .cke_icon, ${btnSel("RTEInsertForm")} .cke_button_icon, .cke_button_RTEInsertForm_icon,
      ${btnSel("RTEFormLink")} .cke_icon, ${btnSel("RTEFormLink")} .cke_button_icon, .cke_button_RTEFormLink_icon,
      ${btnSel("RTEInsertContactForm")} .cke_icon, ${btnSel("RTEInsertContactForm")} .cke_button_icon, .cke_button_RTEInsertContactForm_icon { background: none !important; width: 0 !important; min-width: 0 !important; overflow: hidden !important; padding: 0 !important; }
      /* Always show label text */
      ${labelSel("RTEInsertVideo")}, ${labelSel("RTEInsertImage")}, ${labelSel("RTEMediaLibrary")}, ${labelSel("RTEInsertButton")}, ${labelSel("RTEInsertForm")}, ${labelSel("RTEFormLink")}, ${labelSel("RTEInsertContactForm")} { display: inline !important; visibility: visible !important; }
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

  // Fetch forms when any form-related modal opens, including contact form modal.
  useEffect(() => {
    if (showFormModal || showFormLinkModal || showContactFormModal) {
      fetchForms();
    }
  }, [showFormModal, showFormLinkModal, showContactFormModal]);

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

  const insertContactFormCode = () => {
    const editor = editorRef.current;
    const formId = (contactFormOptions.formId || "").trim();
    const title = (contactFormOptions.title || "").trim() || formId;
    const description = (contactFormOptions.description || "").trim();
    const imageUrl = (contactFormOptions.imageUrl || "").trim();
    const buttonText = titleCasePreserveAcronyms(
      (contactFormOptions.buttonText || "").trim() || "Submit"
    );
    if (!editor || !formId) return;

    const escapeHtml = (str) => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const divHtml = `<div class="contact-form-inline" data-form-id="${escapeHtml(formId)}" data-title="${escapeHtml(
      title
    )}" data-description="${escapeHtml(
      description
    )}" data-image-url="${escapeHtml(
      imageUrl
    )}" data-button-text="${escapeHtml(
      buttonText
    )}"><span class="contact-form-editor-placeholder" contenteditable="false" style="display: inline-block; padding: 6px 10px; background: #e0e7ff; color: #3730a3; border-radius: 6px; font-size: 13px; border: 1px dashed #818cf8;">📋 Contact Form: ${escapeHtml(title || formId)}</span></div>`;

    const editingEl = contactFormEditingElementRef.current;
    if (editingEl && typeof CKEDITOR !== "undefined" && CKEDITOR.dom && CKEDITOR.dom.element) {
      try {
        const doc = editor.document;
        const newEl = CKEDITOR.dom.element.createFromHtml(divHtml, doc);
        editingEl.insertBeforeMe(newEl);
        editingEl.remove();
      } catch (err) {
        editor.insertHtml(divHtml);
      }
      contactFormEditingElementRef.current = null;
    } else {
      editor.insertHtml(divHtml);
    }
    setShowContactFormModal(false);
    setContactFormOptions({ formId: "", title: "", description: "", imageUrl: "", buttonText: "" });
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

  // Handle image upload (single or multiple files)
  const handleImageUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    const maxSize = 10 * 1024 * 1024;
    const files = Array.from(fileList);

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setImageError("Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.");
        return;
      }
      if (file.size > maxSize) {
        setImageError("One or more files exceed 10MB. Please choose smaller images.");
        return;
      }
    }

    await uploadAndInsertImage(files);
    e.target.value = "";
  };

  // Handle clipboard paste — show preview first, then user confirms to upload
  useEffect(() => {
    if (!isReady || disabled || !showImageModal) return;

    const clearPasted = () => {
      setPastedImagePreviews((prev) => {
        prev.forEach((p) => {
          try { URL.revokeObjectURL(p.previewUrl); } catch (_) {}
        });
        return [];
      });
    };

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
            if (!allowed.includes(file.type)) return;
            const previewUrl = URL.createObjectURL(file);
            const N = Math.min(3, Math.max(1, parseInt(imageLayout, 10) || 1));
            setUploadImageSlots((prev) => {
              const next = prev.length >= N ? [...prev.slice(0, N)] : [...prev];
              while (next.length < N) next.push(null);
              const idx = next.findIndex((s) => !s);
              if (idx === -1) {
                try { URL.revokeObjectURL(previewUrl); } catch (_) {}
                return prev;
              }
              if (next[idx]?.previewUrl) try { URL.revokeObjectURL(next[idx].previewUrl); } catch (_) {}
              next[idx] = { file, previewUrl };
              return next;
            });
            setImageInsertSource("upload");
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
      setPastedImagePreviews((prev) => {
        prev.forEach((p) => {
          try { URL.revokeObjectURL(p.previewUrl); } catch (_) {}
        });
        return [];
      });
    };
  }, [isReady, disabled, showImageModal, imageLayout]);
  const imageLayoutNum = Math.min(3, Math.max(1, parseInt(imageLayout, 10) || 1));

  // Keep upload slots length in sync with column layout (1/2/3)
  useEffect(() => {
    if (!showImageModal) return;
    setUploadImageSlots((prev) => {
      const N = imageLayoutNum;
      if (prev.length === N) return prev;
      const next = prev.slice(0, N);
      while (next.length < N) next.push(null);
      for (let i = N; i < prev.length; i++) {
        if (prev[i]?.previewUrl) try { URL.revokeObjectURL(prev[i].previewUrl); } catch (_) {}
      }
      return next;
    });
  }, [showImageModal, imageLayoutNum]);

  // Keep URL list length in sync with column layout (1/2/3) for By URL tab
  useEffect(() => {
    if (!showImageModal) return;
    setImageUrlList((prev) => {
      const N = imageLayoutNum;
      if (prev.length === N) return prev;
      if (prev.length < N) return [...prev, ...Array(N - prev.length).fill({ url: "", altText: "" })];
      return prev.slice(0, N);
    });
  }, [showImageModal, imageLayoutNum]);

  // When Insert Image modal opens, move focus into the modal so paste goes to modal not editor
  useEffect(() => {
    if (!showImageModal) return;
    const moveFocus = () => {
      imageModalFocusRef.current?.focus();
    };
    const t = setTimeout(moveFocus, 50);
    return () => clearTimeout(t);
  }, [showImageModal]);

  // Close media picker full-screen preview on Escape
  useEffect(() => {
    if (!imageMediaPickerFullScreen) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setImageMediaPickerFullScreen(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageMediaPickerFullScreen]);

  // Fetch media list when Media Library modal is open
  const mediaLibrarySearchDebounced = mediaLibrarySearch.trim() ? mediaLibrarySearch.trim() : "";
  useEffect(() => {
    if (!showMediaLibraryModal) return;
    let cancelled = false;
    setMediaLibraryLoading(true);
    const params = new URLSearchParams();
    params.set("type", mediaLibraryType);
    params.set("page", String(mediaLibraryPage));
    params.set("limit", "24");
    if (mediaLibrarySearchDebounced) params.set("search", mediaLibrarySearchDebounced);
    api.get(`/media?${params.toString()}`)
      .then((res) => {
        if (cancelled || !res.data?.success) return;
        setMediaLibraryItems(res.data.data?.data ?? []);
        const pagination = res.data.data?.pagination ?? {};
        setMediaLibraryTotalPages(pagination.totalPages ?? 0);
      })
      .catch(() => {
        if (!cancelled) setMediaLibraryItems([]);
      })
      .finally(() => {
        if (!cancelled) setMediaLibraryLoading(false);
      });
    return () => { cancelled = true; };
  }, [showMediaLibraryModal, mediaLibraryPage, mediaLibraryType, mediaLibrarySearchDebounced]);

  // Fetch folders + image list when Insert Image → See Media picker is open
  useEffect(() => {
    if (!showImageModal || imageInsertSource !== "media") return;
    let cancelled = false;
    setImageMediaPickerLoading(true);
    Promise.all([
      api.get("/media/folders?type=image"),
      api.get(`/media?type=image&limit=100&folder=${encodeURIComponent(imageMediaPickerFolder)}`),
    ])
      .then(([foldersRes, mediaRes]) => {
        if (cancelled) return;
        if (foldersRes.data?.success) {
          setImageMediaPickerFolders({
            folders: foldersRes.data.data?.folders ?? [],
            tree: foldersRes.data.data?.tree ?? [],
          });
        }
        if (mediaRes.data?.success) {
          setImageMediaPickerItems(mediaRes.data.data?.data ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setImageMediaPickerItems([]);
      })
      .finally(() => {
        if (!cancelled) setImageMediaPickerLoading(false);
      });
    return () => { cancelled = true; };
  }, [showImageModal, imageInsertSource, imageMediaPickerFolder]);

  // Compress image client-side to reduce size and avoid 413 (Payload Too Large)
  const compressImageIfNeeded = (file, maxSizeBytes = 2 * 1024 * 1024, maxWidth = 1920) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") || file.size <= maxSizeBytes) {
        resolve(file);
        return;
      }
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg") || "image.jpg", { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  // Build HTML for inserting one or more images with optional layout, dimensions, and alignment (1 col only)
  const buildImageInsertHtml = (items, layout, width, height, align) => {
    const list = Array.isArray(items) ? items : [items];
    const entries = list.map((i) =>
      typeof i === "string" ? { url: i, altText: "" } : { url: i?.url || i, altText: i?.altText || "" }
    );
    const urls = entries.map((e) => e.url).filter(Boolean);
    if (!urls.length) return "";
    const w = width && Number(width) > 0 ? `${Number(width)}px` : "";
    const h = height && Number(height) > 0 ? `${Number(height)}px` : "";
    const styleParts = ["max-width: 100%", "height: auto"];
    if (w) styleParts.push(`width: ${w}`);
    if (h) styleParts.push(`height: ${h}`);
    const imgStyle = styleParts.join("; ");
    const cols = layout === "3" ? "3" : layout === "2" ? "2" : "1";
    const alignClass = cols === "1" && align && ["left", "center", "right"].includes(align) ? ` image-align-${align}` : "";
    const wrapperClass = `image-insert-wrapper image-grid-cols-${cols}${alignClass}`.trim();
    const imgs = entries
      .map(
        (e, i) => {
          const imgTag = `<img src="${String(e.url).replace(/"/g, "&quot;")}" alt="${String(e.altText || `Image ${i + 1}`).replace(/"/g, "&quot;")}" style="${imgStyle}" loading="lazy" />`;
          return `<div class="image-grid-cell">${imgTag}</div>`;
        }
      )
      .join("");
    return `<div class="${wrapperClass}">${imgs}</div>`;
  };

  // Upload image(s) to both /api/upload/image and /api/media, then insert into editor
  const uploadAndInsertImage = async (fileOrFiles) => {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : fileOrFiles ? [fileOrFiles] : [];
    if (!files.length) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    const maxSize = 10 * 1024 * 1024;

    try {
      setUploadingImage(true);
      setImageError("");

      const urls = [];
      for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
          setImageError(`Invalid file type: ${file.name}. Only PNG, JPEG, GIF, and WebP are allowed.`);
          return;
        }
        if (file.size > maxSize) {
          setImageError(`File too large: ${file.name}. Max 10MB per file.`);
          return;
        }

        const fileToUpload = await compressImageIfNeeded(file);

        if (onImageUpload) {
          try {
            const result = await onImageUpload(fileToUpload);
            const imageUrl = result?.url;
            const uploadFilename = result?.filename || fileToUpload.name || "image";
            if (!imageUrl) {
              setImageError("Upload did not return a URL");
              return;
            }
            urls.push({ url: imageUrl, altText: uploadFilename || fileToUpload.name || "" });
          } catch (customErr) {
            setImageError(customErr?.message || customErr?.response?.data?.message || "Failed to upload image");
            return;
          }
          continue;
        }

        // 1) Upload via /api/upload/image (stores in assets/{hierarchy} and creates Media record)
        const formDataUpload = new FormData();
        formDataUpload.append("image", fileToUpload);
        if (examId) formDataUpload.append("examId", examId);
        if (subjectId) formDataUpload.append("subjectId", subjectId);
        if (unitId) formDataUpload.append("unitId", unitId);
        if (chapterId) formDataUpload.append("chapterId", chapterId);
        if (topicId) formDataUpload.append("topicId", topicId);
        if (subtopicId) formDataUpload.append("subtopicId", subtopicId);
        if (definitionId) formDataUpload.append("definitionId", definitionId);

        const responseUpload = await api.post("/upload/image", formDataUpload);

        if (!responseUpload.data?.success || !responseUpload.data?.data?.url) {
          setImageError(responseUpload.data?.message || "Failed to upload image");
          return;
        }

        const imageUrl = responseUpload.data.data.url;
        const uploadFilename = responseUpload.data.data.filename || fileToUpload.name || "image";
        const uploadPath = responseUpload.data.data.path || "";

        // 2) Also register in Media with same url/path (no duplicate file) so Media Management shows same URL
        const formDataMedia = new FormData();
        formDataMedia.append("file", fileToUpload);
        formDataMedia.append("name", uploadFilename);
        formDataMedia.append("folder", "editor");
        formDataMedia.append("sourceUrl", imageUrl);
        formDataMedia.append("sourcePath", uploadPath);
        try {
          await api.post("/media", formDataMedia);
        } catch (mediaErr) {
          console.warn("Media API save failed (upload succeeded):", mediaErr);
          // still use imageUrl for insert
        }

        urls.push({ url: imageUrl, altText: uploadFilename || fileToUpload.name || "" });
      }

      if (urls.length) {
        const editor = editorRef.current;
        if (editor) {
          const html = buildImageInsertHtml(urls, imageLayout, imageLayout === "1" ? (imageWidth || undefined) : undefined, imageLayout === "1" ? (imageHeight || undefined) : undefined, imageLayout === "1" ? imageAlign : undefined);
          editor.insertHtml(html);
        }
        setShowImageModal(false);
        setImageInsertSource("upload");
        setImageError("");
        setPastedImagePreviews((prev) => {
          prev.forEach((p) => { try { URL.revokeObjectURL(p.previewUrl); } catch (_) {} });
          return [];
        });
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

        const response = await api.post("/upload/video", formData);

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

      {/* Insert Contact Form modal — form ID (input), title, description, image URL; inserts div for inline form */}
      {showContactFormModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Insert Contact Form</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Form will appear inline. Use the form ID that receives leads (e.g. contact-form).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowContactFormModal(false);
                  contactFormEditingElementRef.current = null;
                  setContactFormOptions({ formId: "", title: "", description: "", imageUrl: "", buttonText: "" });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                aria-label="Close"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Form ID <span className="text-red-500">*</span>
                </label>
                <select
                  value={contactFormOptions.formId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selected = forms.find((f) => f.formId === selectedId);
                    if (!selectedId || !selected) {
                      setContactFormOptions((prev) => ({ ...prev, formId: selectedId }));
                      return;
                    }
                    setContactFormOptions((prev) => ({
                      ...prev,
                      formId: selected.formId || selectedId,
                      title: selected.settings?.title || prev.title || selected.formId || selectedId,
                      description: selected.settings?.description || prev.description || "",
                      imageUrl: selected.settings?.imageUrl || prev.imageUrl || "",
                      buttonText: selected.settings?.buttonText || prev.buttonText || "Submit",
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                >
                  <option value="">
                    {loadingForms ? "Loading forms..." : "Select form ID from Form Management"}
                  </option>
                  {forms.map((form) => (
                    <option key={form._id} value={form.formId}>
                      {form.formId}
                      {form.settings?.title ? ` - ${form.settings.title}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Pick an existing form ID, or type manually below.
                </p>
                <input
                  type="text"
                  value={contactFormOptions.formId}
                  onChange={(e) =>
                    setContactFormOptions((prev) => ({ ...prev, formId: e.target.value }))
                  }
                  placeholder="e.g. contact-form, lead-form"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">ID used when submitting leads. Must match a form in Form Management.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Button Name <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contactFormOptions.buttonText}
                  onChange={(e) =>
                    setContactFormOptions((prev) => ({ ...prev, buttonText: e.target.value }))
                  }
                  placeholder="e.g. Submit, Apply Now"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contactFormOptions.title}
                  onChange={(e) =>
                    setContactFormOptions((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Connect With Us"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={contactFormOptions.description}
                  onChange={(e) =>
                    setContactFormOptions((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Short description for the form"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Image URL <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contactFormOptions.imageUrl}
                  onChange={(e) =>
                    setContactFormOptions((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="https://... or path like /images/form.png"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowContactFormModal(false);
                  contactFormEditingElementRef.current = null;
                  setContactFormOptions({ formId: "", title: "", description: "", imageUrl: "", buttonText: "" });
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertContactFormCode}
                disabled={!contactFormOptions.formId.trim()}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert Contact Form
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
          <div
            ref={imageModalFocusRef}
            tabIndex={-1}
            className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col outline-none ${imageInsertSource === "media" ? "max-w-2xl" : "max-w-lg"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="insert-image-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
              <div>
                <h2 id="insert-image-modal-title" className="text-xl font-semibold text-gray-900">
                  {imageInsertSource === "media" ? "Select from Media" : "Insert Image"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {imageInsertSource === "media"
                    ? "Choose images from Media Library (images only, by folder)"
                    : "Upload, paste a URL, or choose from Media Library"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageInsertSource("upload");
                  setImageMediaPickerSelected(new Set());
                  setImageMediaPickerFullScreen(null);
                  setImageMediaPickerCopyUrlToast(false);
                  setImageUrl("");
                  setImageAltText("");
                  setImageUrlList([{ url: "", altText: "" }]);
                  setPastedImagePreviews((prev) => {
                    prev.forEach((p) => { try { URL.revokeObjectURL(p.previewUrl); } catch (_) {} });
                    return [];
                  });
                  setUploadImageSlots((prev) => {
                    prev.forEach((s) => { if (s?.previewUrl) try { URL.revokeObjectURL(s.previewUrl); } catch (_) {} });
                    return [null];
                  });
                  setImageError("");
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Picker view vs Upload view */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {imageInsertSource === "media" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setImageInsertSource("upload");
                      setImageMediaPickerSelected(new Set());
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-4"
                  >
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">←</span>
                    Back
                  </button>

                  {/* Column layout – choose how inserted images will display */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Layout (columns)</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImageLayout("1")}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${imageLayout === "1" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                      >
                        1 col
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageLayout("2")}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${imageLayout === "2" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                      >
                        2 col
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageLayout("3")}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${imageLayout === "3" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                      >
                        3 col
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Choose how many columns to show (responsive).</p>
                  </div>

                  {imageLayout === "1" && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Width & height (optional)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Width (px)</label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          placeholder="Auto"
                          value={imageWidth}
                          onChange={(e) => setImageWidth(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Height (px)</label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          placeholder="Auto"
                          value={imageHeight}
                          onChange={(e) => setImageHeight(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/50"
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Leave empty for auto. Applied to all inserted images.</p>
                  </div>
                  )}
                  {imageLayout === "1" && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alignment</p>
                    <div className="flex gap-2">
                      {["left", "center", "right"].map((al) => (
                        <button
                          key={al}
                          type="button"
                          onClick={() => setImageAlign(al)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium capitalize transition ${imageAlign === al ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          {al}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Folder</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setImageMediaPickerFolder("")}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition ${imageMediaPickerFolder === "" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                      >
                        All images
                      </button>
                      {(imageMediaPickerFolders.folders || []).map((f) => (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => setImageMediaPickerFolder(f.path)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition flex items-center gap-1.5 ${imageMediaPickerFolder === f.path ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          <FaFolderOpen className="w-4 h-4" />
                          {f.name || f.path}
                          {f.count != null ? ` (${f.count})` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                  {imageMediaPickerLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <FaSpinner className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                  ) : imageMediaPickerItems.length === 0 ? (
                    <div className="text-center py-16 rounded-xl bg-gray-50 border border-gray-100">
                      <FaImage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">No images in this folder</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-2">Select up to {imageLayoutNum} image{imageLayoutNum > 1 ? "s" : ""} for this layout. Click to select/deselect. Double-click for full-screen preview.</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setImageMediaPickerSelected(new Set(imageMediaPickerItems.slice(0, imageLayoutNum).map((i) => i._id)))}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Select up to {imageLayoutNum}
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMediaPickerSelected(new Set())}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          Clear selection
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {imageMediaPickerItems.map((item) => (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => {
                              setImageMediaPickerSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(item._id)) next.delete(item._id);
                                else if (next.size < imageLayoutNum) next.add(item._id);
                                return next;
                              });
                            }}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setImageMediaPickerFullScreen({ url: item.url, altText: item.altText || item.name, name: item.name || item.fileName });
                            }}
                            className={`rounded-xl border-2 overflow-hidden text-left transition relative ${imageMediaPickerSelected.has(item._id) ? "border-indigo-500 ring-2 ring-indigo-200 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                          >
                            <div className="aspect-square flex items-center justify-center bg-gray-100">
                              <img src={item.url} alt={item.altText || item.name} className="w-full h-full object-cover" />
                              {imageMediaPickerSelected.has(item._id) && (
                                <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                              )}
                            </div>
                            <p className="p-2 text-xs text-gray-600 truncate bg-white border-t border-gray-100" title={item.name}>{item.name || item.fileName}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {imageMediaPickerSelected.size > 0 && (
                    <>
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">{imageMediaPickerSelected.size} selected · {imageLayout} col layout</span>
                        <button
                          type="button"
                          onClick={() => {
                            const editor = editorRef.current;
                            if (!editor) return;
                            const selected = imageMediaPickerItems.filter((i) => imageMediaPickerSelected.has(i._id)).slice(0, imageLayoutNum);
                            const items = selected.map((i) => ({ url: i.url, altText: i.altText || i.name }));
                            const html = buildImageInsertHtml(items, imageLayout, imageLayout === "1" ? (imageWidth || undefined) : undefined, imageLayout === "1" ? (imageHeight || undefined) : undefined, imageLayout === "1" ? imageAlign : undefined);
                            editor.insertHtml(html);
                            setShowImageModal(false);
                            setImageInsertSource("upload");
                            setImageMediaPickerSelected(new Set());
                          }}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition"
                        >
                          Insert selected
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Layout & dimensions – shared */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Layout (responsive)</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setImageLayout("1")}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${imageLayout === "1" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          1 col
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageLayout("2")}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${imageLayout === "2" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          2 col
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageLayout("3")}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition ${imageLayout === "3" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          3 col
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-400">1 col: single column · 2 col: 1 on mobile, 2 on tablet+ · 3 col: 1 → 2 → 3 by screen size</p>
                    </div>
                    {imageLayout === "1" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Width (px)</label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          placeholder="Auto"
                          value={imageWidth}
                          onChange={(e) => setImageWidth(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Height (px)</label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          placeholder="Auto"
                          value={imageHeight}
                          onChange={(e) => setImageHeight(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-gray-50/50"
                        />
                      </div>
                    </div>
                    )}
                    {imageLayout === "1" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Alignment</label>
                      <div className="flex gap-2">
                        {["left", "center", "right"].map((al) => (
                          <button
                            key={al}
                            type="button"
                            onClick={() => setImageAlign(al)}
                            className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium capitalize transition ${imageAlign === al ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                          >
                            {al}
                          </button>
                        ))}
                      </div>
                    </div>
                    )}

                  </div>

                  {/* Tabs: Upload | By URL | Media Library */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
                      {[
                        { id: "upload", label: "Upload", icon: FaUpload },
                        { id: "url", label: "By URL", icon: FaImage },
                        { id: "media", label: "Media Library", icon: FaFolderOpen },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setImageInsertSource(id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${imageInsertSource === id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    {imageInsertSource === "upload" && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Upload image(s)</label>
                        <p className="text-xs text-gray-500 -mt-1">Choose layout first, then add one image per column (or paste). Click Upload to save and insert.</p>

                        {(() => {
                          const N = imageLayoutNum;
                          const slots = uploadImageSlots.length >= N ? uploadImageSlots : [...uploadImageSlots, ...Array(N - uploadImageSlots.length).fill(null)];
                          const hasAny = slots.some((s) => s != null);
                          return (
                            <>
                              <div className={`grid gap-3 image-insert-wrapper image-grid-cols-${imageLayout}`}>
                                {Array.from({ length: N }, (_, i) => (
                                  <div key={i} className="image-grid-cell rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-3 min-h-[120px]">
                                    {slots[i] ? (
                                      <div className="relative">
                                        <img src={slots[i].previewUrl} alt={`Slot ${i + 1}`} className="w-full h-28 object-contain rounded-lg bg-white border border-gray-100" />
                                        <button
                                          type="button"
                                          onClick={() => setUploadImageSlots((prev) => {
                                            const next = [...prev];
                                            if (next[i]?.previewUrl) try { URL.revokeObjectURL(next[i].previewUrl); } catch (_) {}
                                            next[i] = null;
                                            return next;
                                          })}
                                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="cursor-pointer flex flex-col items-center justify-center h-28 text-gray-500 hover:text-indigo-600 transition">
                                        <input
                                          type="file"
                                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
                                            if (!allowed.includes(file.type)) { setImageError("Invalid file type."); return; }
                                            if (file.size > 10 * 1024 * 1024) { setImageError("File exceeds 10MB."); return; }
                                            setUploadImageSlots((prev) => {
                                              const next = [...prev];
                                              if (next[i]?.previewUrl) try { URL.revokeObjectURL(next[i].previewUrl); } catch (_) {}
                                              next[i] = { file, previewUrl: URL.createObjectURL(file) };
                                              return next;
                                            });
                                            e.target.value = "";
                                          }}
                                          disabled={uploadingImage}
                                        />
                                        <FaUpload className="w-8 h-8 mb-1" />
                                        <span className="text-xs">Slot {i + 1}</span>
                                      </label>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {hasAny && (
                                <div className="flex gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const files = slots.map((s) => s?.file).filter(Boolean);
                                      if (!files.length) return;
                                      setUploadImageSlots((prev) => {
                                        prev.forEach((s) => { if (s?.previewUrl) try { URL.revokeObjectURL(s.previewUrl); } catch (_) {} });
                                        return Array(N).fill(null);
                                      });
                                      uploadAndInsertImage(files);
                                    }}
                                    disabled={uploadingImage}
                                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                                  >
                                    Upload & Insert
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUploadImageSlots((prev) => {
                                      prev.forEach((s) => { if (s?.previewUrl) try { URL.revokeObjectURL(s.previewUrl); } catch (_) {} });
                                      return Array(N).fill(null);
                                    })}
                                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {imageInsertSource === "url" && (
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Image URL(s)</label>
                        <p className="text-xs text-gray-500 -mt-1">Enter one URL per column ({imageLayoutNum} col layout).</p>
                        {Array.from({ length: imageLayoutNum }, (_, i) => (
                          <div key={i} className="space-y-1">
                            <label className="block text-xs font-medium text-gray-500">Image {i + 1} URL</label>
                            <input
                              type="url"
                              placeholder="https://example.com/image.jpg"
                              value={imageUrlList[i]?.url ?? ""}
                              onChange={(e) => setImageUrlList((prev) => {
                                const next = [...prev];
                                while (next.length <= i) next.push({ url: "", altText: "" });
                                next[i] = { ...next[i], url: e.target.value };
                                return next;
                              })}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Alt text (optional)"
                              value={imageUrlList[i]?.altText ?? ""}
                              onChange={(e) => setImageUrlList((prev) => {
                                const next = [...prev];
                                while (next.length <= i) next.push({ url: "", altText: "" });
                                next[i] = { ...next[i], altText: e.target.value };
                                return next;
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-gray-400"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const items = imageUrlList.slice(0, imageLayoutNum).map((o) => ({ url: (o?.url || "").trim(), altText: (o?.altText || "").trim() })).filter((o) => o.url);
                            if (!items.length) {
                              setImageError("Enter at least one image URL.");
                              return;
                            }
                            setImageError("");
                            const editor = editorRef.current;
                            if (editor) {
                              const html = buildImageInsertHtml(items, imageLayout, imageLayout === "1" ? (imageWidth || undefined) : undefined, imageLayout === "1" ? (imageHeight || undefined) : undefined, imageLayout === "1" ? imageAlign : undefined);
                              editor.insertHtml(html);
                              setShowImageModal(false);
                              setImageUrlList(Array(imageLayoutNum).fill({ url: "", altText: "" }));
                            }
                          }}
                          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm transition"
                        >
                          Insert {imageLayoutNum} image{imageLayoutNum > 1 ? "s" : ""}
                        </button>
                      </div>
                    )}

                  </div>

                  {imageError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="text-sm text-red-700">{imageError}</p>
                    </div>
                  )}

                  {uploadingImage && (
                    <div className="flex items-center justify-center gap-3 py-4 rounded-xl bg-indigo-50/50">
                      <FaSpinner className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Uploading...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Media picker full-screen image preview – double-click image to open */}
      {imageMediaPickerFullScreen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
          onClick={() => { setImageMediaPickerFullScreen(null); setImageMediaPickerCopyUrlToast(false); }}
          role="button"
          tabIndex={-1}
          aria-label="Close full screen preview"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setImageMediaPickerFullScreen(null); setImageMediaPickerCopyUrlToast(false); }}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <FaTimes className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageMediaPickerFullScreen.url}
              alt={imageMediaPickerFullScreen.altText || imageMediaPickerFullScreen.name || "Preview"}
              className="max-w-full max-h-[95vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-[90vw]">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {imageMediaPickerFullScreen.name && (
                <span className="text-white/90 text-sm truncate max-w-[50vw]">{imageMediaPickerFullScreen.name}</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof navigator?.clipboard?.writeText === "function") {
                    navigator.clipboard.writeText(imageMediaPickerFullScreen.url);
                    setImageMediaPickerCopyUrlToast(true);
                    setTimeout(() => setImageMediaPickerCopyUrlToast(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
              >
                <FaCopy className="w-4 h-4 shrink-0" />
                {imageMediaPickerCopyUrlToast ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Media Library Modal – browse files and copy URL */}
      {showMediaLibraryModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <FaFolderOpen className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Browse files and copy URL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaLibraryModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative flex-1 min-w-[180px]">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={mediaLibrarySearch}
                  onChange={(e) => { setMediaLibrarySearch(e.target.value); setMediaLibraryPage(1); }}
                  placeholder="Search by name..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
              <div className="flex rounded-lg border border-gray-200 p-0.5">
                {["image", "video", "document", "file"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setMediaLibraryType(t); setMediaLibraryPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${mediaLibraryType === t ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    {t === "image" ? "Images" : t === "video" ? "Videos" : t === "document" ? "Docs" : "Files"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {mediaLibraryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : mediaLibraryItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaFolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No files found</p>
                  <p className="text-sm mt-1">Try another type or search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaLibraryItems.map((item) => (
                    <div key={item._id} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 hover:border-gray-300 transition-colors">
                      <div className="aspect-square flex items-center justify-center bg-gray-100">
                        {item.type === "image" ? (
                          <img src={item.url} alt={item.altText || item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-2">
                            {item.type === "video" ? <FaVideo className="w-10 h-10 text-indigo-500 mx-auto" /> : <FaFileAlt className="w-10 h-10 text-gray-400 mx-auto" />}
                            <span className="text-xs text-gray-500 block mt-1 truncate">{item.fileName}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-900 truncate" title={item.name}>{item.name || item.fileName}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator?.clipboard?.writeText === "function") {
                                navigator.clipboard.writeText(item.url);
                                setMediaLibraryCopyToast(item._id);
                                setTimeout(() => setMediaLibraryCopyToast(null), 2000);
                              }
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <FaCopy className="w-3 h-3" />
                            {mediaLibraryCopyToast === item._id ? "Copied!" : "Copy URL"}
                          </button>
                          {item.type === "image" && (
                            <button
                              type="button"
                              onClick={() => {
                                const editor = editorRef.current;
                                if (editor) {
                                  const imageHtml = `<img src="${item.url}" alt="${(item.altText || item.name || "").replace(/"/g, "&quot;")}" style="max-width: 100%; height: auto;" />`;
                                  editor.insertHtml(imageHtml);
                                }
                                setShowMediaLibraryModal(false);
                              }}
                              className="px-2 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                            >
                              Insert
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {mediaLibraryTotalPages > 1 && !mediaLibraryLoading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setMediaLibraryPage((p) => Math.max(1, p - 1))}
                    disabled={mediaLibraryPage <= 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {mediaLibraryPage} of {mediaLibraryTotalPages}</span>
                  <button
                    type="button"
                    onClick={() => setMediaLibraryPage((p) => Math.min(mediaLibraryTotalPages, p + 1))}
                    disabled={mediaLibraryPage >= mediaLibraryTotalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
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
