import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    formId: {
      type: String,
      required: [true, "Form ID is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        "Form ID can only contain lowercase letters, numbers, and hyphens",
      ],
    },
    formName: {
      type: String,
      required: false, // Made optional - will use formId as fallback
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fields: [
      {
        fieldId: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["text", "email", "tel", "select", "textarea", "number"],
          required: true,
        },
        label: {
          type: String,
          required: true,
          trim: true,
        },
        placeholder: {
          type: String,
          trim: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
        validation: {
          minLength: Number,
          maxLength: Number,
          pattern: String,
          message: String,
        },
        options: [String], // For select fields
        defaultValue: String,
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    settings: {
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      buttonText: {
        type: String,
        default: "Submit",
        trim: true,
      },
      successMessage: {
        type: String,
        default: "Thank you! Your request has been submitted successfully.",
        trim: true,
      },
      modal: {
        type: Boolean,
        default: true,
      },
      showVerification: {
        type: Boolean,
        default: true,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    submissionCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Note: formId index is automatically created by unique: true
formSchema.index({ status: 1 });
formSchema.index({ createdAt: -1 });

if (mongoose.models?.Form) {
  delete mongoose.models.Form;
}
if (mongoose.modelSchemas?.Form) {
  delete mongoose.modelSchemas.Form;
}

const Form = mongoose.model("Form", formSchema);

export default Form;
