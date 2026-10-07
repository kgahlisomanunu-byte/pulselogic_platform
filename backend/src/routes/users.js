const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ← FIXED: Removed { }

// GET all users
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT user_id, email, full_name, role, facility_id, status, created_at FROM users');
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

// GET user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            'SELECT user_id, email, full_name, role, facility_id, department_id, phone, status, created_at FROM users WHERE user_id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
});

// POST create user
router.post('/', async (req, res) => {
    try {
        const { email, full_name, role, facility_id, department_id, phone, password_hash } = req.body;
        
        // Validate required fields
        if (!email || !full_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, full name, and role are required'
            });
        }
        
        const [result] = await db.query(
            'INSERT INTO users (email, full_name, role, facility_id, department_id, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email, full_name, role, facility_id || null, department_id || null, phone || null, password_hash || 'hashed_placeholder']
        );
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user_id: result.insertId, email, full_name, role }
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
});

// PUT update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, facility_id, department_id, phone, status } = req.body;
        
        const [result] = await db.query(
            'UPDATE users SET full_name = ?, role = ?, facility_id = ?, department_id = ?, phone = ?, status = ? WHERE user_id = ?',
            [full_name, role, facility_id, department_id, phone, status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
});

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query(
            'DELETE FROM users WHERE user_id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

module.exports = router;