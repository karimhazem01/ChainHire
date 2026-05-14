const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

// Index for faster conversation fetching
messageSchema.index({ jobId: 1, senderId: 1, receiverId: 1 });

module.exports = mongoose.model('Message', messageSchema);
