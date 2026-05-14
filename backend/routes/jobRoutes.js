const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Application = require('../models/Application');

// Create a new job
router.post('/', async (req, res) => {
    try {
        const { jobId, title, description, budget, clientId, deadline } = req.body;
        
        const job = new Job({
            jobId,
            title,
            description,
            budget,
            clientId,
            deadline,
            status: 'Open'
        });

        await job.save();
        res.status(201).json({ job });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find()
            .populate('clientId', 'name walletAddress role bio skills profileImage')
            .populate('freelancerId', 'name walletAddress role bio skills profileImage');
        res.status(200).json({ jobs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Apply for a job
router.post('/:id/apply', async (req, res) => {
    try {
        const { freelancerId, message } = req.body;
        const job = await Job.findById(req.params.id);

        if (!job) return res.status(404).json({ error: 'Job not found' });
        if (job.status !== 'Open') return res.status(400).json({ error: 'Job is not open for applications' });

        const application = new Application({
            jobId: job._id,
            freelancerId,
            message
        });

        await application.save();
        res.status(201).json({ application });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept an application
router.post('/:id/accept', async (req, res) => {
    try {
        const { applicationId } = req.body;
        
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const application = await Application.findById(applicationId);
        if (!application) return res.status(404).json({ error: 'Application not found' });

        // Update Job and Application status
        job.freelancerId = application.freelancerId;
        job.status = 'Funded'; // In reality, this transitions to Funded after smart contract funding
        await job.save();

        application.status = 'Accepted';
        await application.save();

        res.status(200).json({ job, application });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject an application
router.post('/:id/reject', async (req, res) => {
    try {
        const { applicationId } = req.body;
        const application = await Application.findById(applicationId);
        if (!application) return res.status(404).json({ error: 'Application not found' });

        application.status = 'Rejected';
        await application.save();

        res.status(200).json({ application });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Job Status (used to sync with blockchain)
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        job.status = status;
        await job.save();

        res.status(200).json({ job });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit a job
router.patch('/:id', async (req, res) => {
    try {
        const { title, description, budget, deadline } = req.body;
        const job = await Job.findById(req.params.id);
        
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (title !== undefined) job.title = title;
        if (description !== undefined) job.description = description;
        if (budget !== undefined) job.budget = budget;
        if (deadline !== undefined) job.deadline = deadline;

        await job.save();
        res.status(200).json({ job });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a job
router.delete('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        // Delete associated applications
        await Application.deleteMany({ jobId: job._id });
        await Job.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Job and associated applications deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
