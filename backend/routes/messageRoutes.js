const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Application = require('../models/Application');
const Job = require('../models/Job');

// Get conversation history between two participants for a job
router.get('/:jobId/:p1/:p2', async (req, res) => {
    try {
        const { jobId, p1, p2 } = req.params;
        const messages = await Message.find({
            jobId,
            $or: [
                { senderId: p1, receiverId: p2 },
                { senderId: p2, receiverId: p1 }
            ]
        }).sort({ createdAt: 1 });
        
        res.status(200).json({ messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send message (REST fallback/initial validation)
router.post('/', async (req, res) => {
    try {
        const { senderId, receiverId, jobId, content } = req.body;

        // Validation Rules:
        // 1. Get Application status
        const application = await Application.findOne({ jobId, freelancerId: { $in: [senderId, receiverId] } });
        if (!application) return res.status(403).json({ error: 'No application found for this conversation' });

        // 2. Check Job for ClientId
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const isClient = senderId === job.clientId.toString();
        const isFreelancer = !isClient;

        // RULE: Rejected = Locked
        if (application.status === 'Rejected') {
            return res.status(403).json({ error: 'This conversation is locked (Application Rejected)' });
        }

        // RULE: Before Acceptance, only Client can initiate
        if (application.status === 'Pending' && isFreelancer) {
            // Check if client has already sent a message
            const clientSentMessage = await Message.findOne({ jobId, senderId: job.clientId, receiverId: senderId });
            if (!clientSentMessage) {
                return res.status(403).json({ error: 'Freelancers cannot initiate contact before the client messages first' });
            }
        }

        const newMessage = new Message({ senderId, receiverId, jobId, content });
        await newMessage.save();

        res.status(201).json({ message: newMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread count for a user
router.get('/unread-count/:userId', async (req, res) => {
    try {
        const count = await Message.countDocuments({ receiverId: req.params.userId, isRead: false });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark as read
router.patch('/read', async (req, res) => {
    try {
        const { jobId, userId, otherId } = req.body;
        await Message.updateMany(
            { jobId, receiverId: userId, senderId: otherId, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread counts grouped by jobId for a user
router.get('/unread-per-app/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const unreadMessages = await Message.find({ receiverId: userId, isRead: false });
        
        const counts = {};
        unreadMessages.forEach(msg => {
            const jobId = msg.jobId.toString();
            counts[jobId] = (counts[jobId] || 0) + 1;
        });
        
        res.status(200).json({ counts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
