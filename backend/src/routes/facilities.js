// backend/src/routes/facilities.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// ─── GET ALL FACILITIES ───
router.get('/', async (req, res) => {
    try {
        const [facilities] = await db.query(`
            SELECT f.*,
                   o.name as organization_name
            FROM facilities f
            LEFT JOIN organizations o ON f.organization_id = o.organization_id
            ORDER BY f.facility_name ASC
        `);

        res.json({
            success: true,
            facilities,
            count: facilities.length
        });
    } catch (error) {
        console.error('❌ Error fetching facilities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch facilities',
            error: error.message
        });
    }
});

// ─── GET FACILITY BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const [facilities] = await db.query(`
            SELECT f.*,
                   o.name as organization_name
            FROM facilities f
            LEFT JOIN organizations o ON f.organization_id = o.organization_id
            WHERE f.facility_id = ?
        `, [req.params.id]);

        if (facilities.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        res.json({
            success: true,
            facility: facilities[0]
        });
    } catch (error) {
        console.error('❌ Error fetching facility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch facility',
            error: error.message
        });
    }
});

// ─── CREATE FACILITY ───
router.post('/', async (req, res) => {
    try {
        const {
            facility_name,
            facility_type,
            facility_level,
            organization_id,
            address,
            city,
            province,
            postal_code,
            phone,
            email,
            latitude,
            longitude,
            status
        } = req.body;

        if (!facility_name || !facility_type) {
            return res.status(400).json({
                success: false,
                message: 'Facility name and type are required'
            });
        }

        const [result] = await db.query(`
            INSERT INTO facilities (
                facility_name,
                facility_type,
                facility_level,
                organization_id,
                address,
                city,
                province,
                postal_code,
                phone,
                email,
                latitude,
                longitude,
                status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            facility_name,
            facility_type,
            facility_level || 'clinic',
            organization_id || null,
            address || null,
            city || null,
            province || null,
            postal_code || null,
            phone || null,
            email || null,
            latitude || null,
            longitude || null,
            status || 'active'
        ]);

        res.status(201).json({
            success: true,
            message: 'Facility created successfully',
            facility_id: result.insertId
        });

    } catch (error) {
        console.error('❌ Error creating facility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create facility',
            error: error.message
        });
    }
});

// ─── UPDATE FACILITY ───
router.put('/:id', async (req, res) => {
    try {
        const {
            facility_name,
            facility_type,
            facility_level,
            organization_id,
            address,
            city,
            province,
            postal_code,
            phone,
            email,
            latitude,
            longitude,
            status
        } = req.body;

        const [existing] = await db.query(
            'SELECT * FROM facilities WHERE facility_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        await db.query(`
            UPDATE facilities SET
                facility_name = ?,
                facility_type = ?,
                facility_level = ?,
                organization_id = ?,
                address = ?,
                city = ?,
                province = ?,
                postal_code = ?,
                phone = ?,
                email = ?,
                latitude = ?,
                longitude = ?,
                status = ?,
                updated_at = NOW()
            WHERE facility_id = ?
        `, [
            facility_name || existing[0].facility_name,
            facility_type || existing[0].facility_type,
            facility_level || existing[0].facility_level,
            organization_id || existing[0].organization_id,
            address || existing[0].address,
            city || existing[0].city,
            province || existing[0].province,
            postal_code || existing[0].postal_code,
            phone || existing[0].phone,
            email || existing[0].email,
            latitude || existing[0].latitude,
            longitude || existing[0].longitude,
            status || existing[0].status,
            req.params.id
        ]);

        res.json({
            success: true,
            message: 'Facility updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating facility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update facility',
            error: error.message
        });
    }
});

// ─── DELETE FACILITY ───
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await db.query(
            'SELECT * FROM facilities WHERE facility_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        await db.query(
            'DELETE FROM facilities WHERE facility_id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Facility deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting facility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete facility',
            error: error.message
        });
    }
});

module.exports = router;