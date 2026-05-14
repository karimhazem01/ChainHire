const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    walletAddress: { type: String, required: true, unique: true },
    role: { type: String, enum: ['client', 'freelancer'], required: true },
    publicKey: { type: String, default: null },
    bio: { type: String, default: '' },
    skills: { type: [String], default: [] },
    profileImage: { type: String, default: null },
    resume: { type: String, default: null },
    portfolio: { type: [{
        title: { type: String, required: true },
        url: { type: String, default: '' },
        description: { type: String, default: '' }
    }], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
