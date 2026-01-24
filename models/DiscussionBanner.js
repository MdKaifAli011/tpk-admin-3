const mongoose = require('mongoose');

const discussionBannerSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  banners: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    altText: {
      type: String,
      default: 'Discussion Forum Banner'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  defaultBannerIndex: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
discussionBannerSchema.index({ examId: 1 });
discussionBannerSchema.index({ 'banners.isActive': 1 });

module.exports = mongoose.models.DiscussionBanner || mongoose.model('DiscussionBanner', discussionBannerSchema);
