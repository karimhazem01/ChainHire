const express = require('express');
const router = express.Router();
const Application = require('../models/Application');

// Get applications with optional query filters
router.get('/', async (req, res) => {
    try {
        const { freelancerId, jobId } = req.query;
        
        let query = {};
        if (freelancerId) query.freelancerId = freelancerId;
        
        if (jobId) {
            if (jobId.includes(',')) {
                query.jobId = { $in: jobId.split(',') };
            } else {
                query.jobId = jobId;
            }
        }

        const applications = await Application.find(query)
            .populate('freelancerId', 'name walletAddress role bio skills profileImage publicKey')
            .populate({
                path: 'jobId',
                select: 'title budget status clientId',
                populate: {
                    path: 'clientId',
                    select: 'name walletAddress profileImage publicKey'
                }
            });

        res.status(200).json({ applications });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
