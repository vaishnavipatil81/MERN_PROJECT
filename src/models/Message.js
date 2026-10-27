const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', trim: true, maxlength: 2000 },
    attachment: {
      kind: { type: String, enum: ['image', 'audio', 'file'] },
      name: { type: String, trim: true, maxlength: 160 },
      mimeType: { type: String, trim: true, maxlength: 120 },
      size: { type: Number, default: 0 },
      dataUrl: { type: String, maxlength: 12 * 1024 * 1024 }
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deletedForEveryone: { type: Boolean, default: false },
    editedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
