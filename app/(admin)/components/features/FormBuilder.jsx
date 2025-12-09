"use client";
import React, { useState, useEffect } from "react";
import { FaPlus, FaSave, FaTimes } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { getDefaultRequiredFields } from "./formConstants";
import FormFieldEditor from "./FormFieldEditor";

const FormBuilder = ({ form, onClose }) => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [formData, setFormData] = useState({
    formId: "",
    description: "",
    fields: [],
    settings: {
      title: "",
      description: "",
      buttonText: "Submit",
      successMessage:
        "Thank you! Your request has been submitted successfully.",
      modal: true,
      showVerification: true,
    },
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (form) {
      // Editing existing form - load its data
      setFormData({
        formId: form.formId || "",
        description: form.description || "",
        fields: form.fields || [],
        settings: {
          title: form.settings?.title || form.formId || "",
          description: form.settings?.description || "",
          buttonText: form.settings?.buttonText || "Submit",
          successMessage:
            form.settings?.successMessage ||
            "Thank you! Your request has been submitted successfully.",
          modal:
            form.settings?.modal !== undefined ? form.settings.modal : true,
          showVerification:
            form.settings?.showVerification !== undefined
              ? form.settings.showVerification
              : true,
        },
        status: form.status || "active",
      });
    } else {
      // Creating new form - pre-populate with required Lead fields
      setFormData({
        formId: "",
        description: "",
        fields: getDefaultRequiredFields(),
        settings: {
          title: "",
          description: "",
          buttonText: "Submit",
          successMessage:
            "Thank you! Your request has been submitted successfully.",
          modal: true,
          showVerification: true,
        },
        status: "active",
      });
    }
  }, [form]);

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "email", label: "Email" },
    { value: "tel", label: "Phone" },
    { value: "select", label: "Select" },
    { value: "textarea", label: "Textarea" },
    { value: "number", label: "Number" },
  ];

  const addField = () => {
    const newField = {
      fieldId: `field-${Date.now()}`,
      type: "text",
      label: "",
      placeholder: "",
      name: "",
      required: false,
      validation: {},
      options: [],
      defaultValue: "",
      order: formData.fields.length,
    };
    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    });
  };

  const removeField = (index) => {
    const newFields = formData.fields.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      fields: newFields.map((field, i) => ({ ...field, order: i })),
    });
  };

  const updateField = (index, updates) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const moveField = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.fields.length - 1)
    ) {
      return;
    }

    const newFields = [...formData.fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];

    // Update order
    newFields.forEach((field, i) => {
      field.order = i;
    });

    setFormData({ ...formData, fields: newFields });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.formId.trim()) {
      newErrors.formId = "Form ID is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.formId.trim())) {
      newErrors.formId =
        "Form ID can only contain lowercase letters, numbers, and hyphens";
    }

    if (formData.fields.length === 0) {
      newErrors.fields = "At least one field is required";
    }

    formData.fields.forEach((field, index) => {
      if (!field.label.trim()) {
        newErrors[`field-${index}-label`] = "Field label is required";
      }
      if (!field.name.trim()) {
        newErrors[`field-${index}-name`] = "Field name is required";
      }
      if (
        field.type === "select" &&
        (!field.options || field.options.length === 0)
      ) {
        newErrors[`field-${index}-options`] =
          "Select fields must have at least one option";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError("Please fix the errors before saving");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        formId: formData.formId.trim().toLowerCase(),
        description: formData.description.trim(),
        fields: formData.fields.map((field) => ({
          fieldId: field.fieldId,
          type: field.type,
          label: field.label.trim(),
          placeholder: field.placeholder.trim(),
          name: field.name.trim(),
          required: field.required,
          validation: field.validation || {},
          options: field.options || [],
          defaultValue: field.defaultValue || "",
          order: field.order,
        })),
        settings: formData.settings,
        status: formData.status,
      };

      let response;
      if (form) {
        // Update existing form
        response = await api.put(`/form/${form.formId}`, payload);
      } else {
        // Create new form
        response = await api.post("/form", payload);
      }

      if (response.data?.success) {
        success(
          form ? "Form updated successfully!" : "Form created successfully!"
        );
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        showError(response.data?.message || "Failed to save form");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save form");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {form ? "Edit Form" : "Create New Form"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.formId}
                onChange={(e) =>
                  setFormData({ ...formData, formId: e.target.value })
                }
                placeholder="e.g., download-form, contact-form"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.formId ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                disabled={!!form}
              />
              {errors.formId && (
                <p className="mt-1 text-xs text-red-600">{errors.formId}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only. This will be used as the form name. Cannot be changed after creation.
              </p>
            </div>

            {form && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description of the form"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}

            {!form && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> All required fields (Name, Email,
                  Country, Class Name, Phone Number) are automatically added.
                  You can customize them after creation. The Form ID will be used as the form name. Additional settings can
                  be configured when editing the form.
                </p>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Form Fields
              </h3>
              <button
                onClick={addField}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FaPlus className="text-xs" />
                Add Field
              </button>
            </div>

            {errors.fields && (
              <p className="text-xs text-red-600">{errors.fields}</p>
            )}

            <div className="space-y-4">
              {formData.fields.map((field, index) => (
                <FormFieldEditor
                  key={field.fieldId}
                  field={field}
                  index={index}
                  totalFields={formData.fields.length}
                  errors={errors}
                  fieldTypes={fieldTypes}
                  onUpdate={updateField}
                  onRemove={removeField}
                  onMove={moveField}
                />
              ))}
            </div>
          </div>

          {/* Settings - Only show when editing */}
          {form && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Form Settings
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Title
                </label>
                <input
                  type="text"
                  value={formData.settings.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, title: e.target.value },
                    })
                  }
                  placeholder="Form title (defaults to form ID)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Description
                </label>
                <textarea
                  value={formData.settings.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="Description shown on the form"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.settings.buttonText}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          buttonText: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Success Message
                </label>
                <textarea
                  value={formData.settings.successMessage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        successMessage: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings.modal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          modal: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show as Modal
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings.showVerification}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          showVerification: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show Verification
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <FaSave className="w-4 h-4" />
            {isSaving ? "Saving..." : form ? "Update Form" : "Create Form"}
          </button>
        </div>
      </div>
    </>
  );
};

export default FormBuilder;
