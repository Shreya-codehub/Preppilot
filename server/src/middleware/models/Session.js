const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
    },
    interviewType: {
      type: String,
      required: true,
      default: 'Technical',
    },
    jobDescription: {
      type: String,
    },
    resumeSnapshot: {
      type: String,
    },
    extractedSkills: [
      {
        type: String,
      },
    ],
    questions: [
      {
        questionText: { type: String, required: true },
        topic: { type: String },
        difficulty: { type: String, default: 'Medium' },
        userAnswer: { type: String, default: '' },
        feedback: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);