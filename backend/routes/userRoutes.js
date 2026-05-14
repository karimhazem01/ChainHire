const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login or Register a user via wallet address
router.post('/auth', async (req, res) => {
    try {
        const { walletAddress, name, role, publicKey } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            // Register if not found and role/name provided
            if (!name || !role) {
                return res.status(400).json({ error: 'User not found. Please provide name and role to register.' });
            }
            user = new User({
                name,
                walletAddress: walletAddress.toLowerCase(),
                role,
                publicKey
            });
            await user.save();
        } else if (publicKey && !user.publicKey) {
            // Update public key if it was missing
            user.publicKey = publicKey;
            await user.save();
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug route to see current user data
router.get('/debug/all', async (req, res) => {
    try {
        const users = await User.find({}, 'name walletAddress role resume portfolio publicKey');
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user profile (by wallet address or ID)
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        let user;
        
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(identifier);
        } else {
            user = await User.findOne({ walletAddress: identifier.toLowerCase() });
        }
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
// Update user profile
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const incomingData = req.body || {};
        
        console.log('--- Profile Update Request ---');
        console.log('ID:', id);
        console.log('Incoming body keys:', Object.keys(incomingData));

        if (!id || id === 'undefined') {
            return res.status(400).json({ error: 'User ID is required' });
        }

        let query = {};
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: id };
        } else {
            query = { walletAddress: id.toLowerCase() };
        }
        
        const user = await User.findOne(query);
        if (!user) {
            console.error(`Update failed: User not found for query: ${JSON.stringify(query)}`);
            return res.status(404).json({ error: 'User not found' });
        }

        // Define which fields we allow to be updated
        const allowedFields = ['bio', 'skills', 'profileImage', 'resume', 'portfolio', 'name', 'publicKey'];
        
        allowedFields.forEach(field => {
            if (incomingData[field] !== undefined) {
                if (field === 'skills') {
                    user.skills = Array.isArray(incomingData.skills)
                        ? incomingData.skills.map(s => String(s).trim()).filter(Boolean)
                        : [];
                } else if (field === 'portfolio') {
                    const rawPortfolio = Array.isArray(incomingData.portfolio) ? incomingData.portfolio : [];
                    user.portfolio = rawPortfolio.map(item => ({
                        title: String(item?.title || '').trim(),
                        url: String(item?.url || '').trim(),
                        description: String(item?.description || '').trim()
                    }));
                } else {
                    user[field] = incomingData[field];
                }
            }
        });

        console.log('About to save user. Resume status:', !!user.resume, 'Size:', user.resume?.length || 0);
        
        const savedUser = await user.save();
        
        // Re-fetch to be 100% sure we are returning what is in the DB
        const confirmedUser = await User.findById(savedUser._id).lean();
        
        console.log(`User ${confirmedUser.walletAddress} persistence check. Resume in DB:`, !!confirmedUser.resume);
        res.status(200).json({ user: confirmedUser });
    } catch (error) {
        console.error('CRITICAL: Error updating user profile:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
