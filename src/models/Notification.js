const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['connection_request', 'connection_accepted', 'message', 'group_invite', 'group_message'],
      required: true
    },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    entityId: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
