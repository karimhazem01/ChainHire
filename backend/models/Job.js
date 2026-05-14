const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    jobId: { type: Number, unique: true, required: true }, // The ID used in the smart contract
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, required: true }, // In ETH
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Open', 'Funded', 'Completed', 'Cancelled', 'Disputed'], default: 'Open' },
    deadline: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
