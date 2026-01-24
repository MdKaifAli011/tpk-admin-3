const mongoose = require('mongoose');

const discussionBannerSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    unique: true
  },
  bannerImage: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  altText: {
    type: String,
    default: 'Discussion Forum Banner'
  }
}, {
  timestamps: true
});

// Index for efficient queries
discussionBannerSchema.index({ examId: 1 });
discussionBannerSchema.index({ isActive: 1 });

module.exports = mongoose.models.DiscussionBanner || mongoose.model('DiscussionBanner', discussionBannerSchema);
