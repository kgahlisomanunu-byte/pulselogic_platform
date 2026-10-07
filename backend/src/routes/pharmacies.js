// backend/src/routes/pharmacies.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// ─── GET ALL PHARMACIES ───
router.get('/', async (req, res) => {
    try {
        const [pharmacies] = await db.query(`
            SELECT * FROM pharmacies 
            WHERE status = 'active' OR status IS NULL
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            pharmacies,
            count: pharmacies.length
        });
    } catch (error) {
        console.error('❌ Error fetching pharmacies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pharmacies',
            error: error.message
        });
    }
});

// ─── GET PHARMACY BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const [pharmacies] = await db.query(
            'SELECT * FROM pharmacies WHERE id = ?',
            [req.params.id]
        );

        if (pharmacies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pharmacy not found'
            });
        }

        res.json({
            success: true,
            pharmacy: pharmacies[0]
        });
    } catch (error) {
        console.error('❌ Error fetching pharmacy:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pharmacy',
            error: error.message
        });
    }
});

// ─── CREATE PHARMACY ───
router.post('/', async (req, res) => {
    try {
        const {
            name,
            address,
            city,
            province,
            phone,
            email,
            license_number,
            status
        } = req.body;

        if (!name || !address) {
            return res.status(400).json({
                success: false,
                message: 'Pharmacy name and address are required'
            });
        }

        const [result] = await db.query(`
            INSERT INTO pharmacies (
                name,
                address,
                city,
                province,
                phone,
                email,
                license_number,
                status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            name,
            address,
            city || null,
            province || null,
            phone || null,
            email || null,
            license_number || null,
            status || 'active'
        ]);

        res.status(201).json({
            success: true,
            message: 'Pharmacy created successfully',
            pharmacy_id: result.insertId
        });

    } catch (error) {
        console.error('❌ Error creating pharmacy:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create pharmacy',
            error: error.message
        });
    }
});

module.exports = router;