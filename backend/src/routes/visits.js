const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// GET all visits
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                v.*,
                p.first_name,
                p.last_name,
                p.phone_number,
                f.facility_name
            FROM patient_visits v
            LEFT JOIN patients p ON v.patient_id = p.patient_id
            LEFT JOIN facilities f ON v.facility_id = f.facility_id
            ORDER BY v.created_at DESC
        `);
        
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visits',
            error: error.message
        });
    }
});

// GET visit by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                v.*,
                p.first_name,
                p.last_name,
                p.phone_number,
                p.email,
                f.facility_name
            FROM patient_visits v
            LEFT JOIN patients p ON v.patient_id = p.patient_id
            LEFT JOIN facilities f ON v.facility_id = f.facility_id
            WHERE v.visit_id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Visit not found'
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
            message: 'Failed to fetch visit',
            error: error.message
        });
    }
});

// GET visits by patient
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const [rows] = await db.query(
            `SELECT 
                v.*,
                f.facility_name
            FROM patient_visits v
            LEFT JOIN facilities f ON v.facility_id = f.facility_id
            WHERE v.patient_id = ?
            ORDER BY v.created_at DESC`,
            [patientId]
        );
        
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient visits',
            error: error.message
        });
    }
});

// POST create visit
router.post('/', async (req, res) => {
    try {
        const {
            patient_id, facility_id, visit_date, visit_type, status, check_in_time
        } = req.body;

        if (!patient_id || !facility_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and Facility ID are required'
            });
        }

        const [result] = await db.query(
            `INSERT INTO patient_visits (
                patient_id, facility_id, visit_date, visit_type, status, check_in_time
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                patient_id, facility_id, 
                visit_date || new Date().toISOString().split('T')[0],
                visit_type || 'General Consultation',
                status || 'active',
                check_in_time || new Date().toISOString().slice(0, 19).replace('T', ' ')
            ]
        );

        // Update total visits count for patient
        await db.query(
            'UPDATE patients SET total_visits = total_visits + 1 WHERE patient_id = ?',
            [patient_id]
        );

        res.status(201).json({
            success: true,
            message: 'Visit created successfully',
            data: { visit_id: result.insertId }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to create visit',
            error: error.message
        });
    }
});

// PUT update visit
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { visit_type, status, check_in_time } = req.body;

        const [result] = await db.query(
            'UPDATE patient_visits SET visit_type = ?, status = ?, check_in_time = ? WHERE visit_id = ?',
            [visit_type, status, check_in_time, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Visit not found'
            });
        }

        res.json({
            success: true,
            message: 'Visit updated successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update visit',
            error: error.message
        });
    }
});

// DELETE visit
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query(
            'DELETE FROM patient_visits WHERE visit_id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Visit not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Visit deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete visit',
            error: error.message
        });
    }
});

module.exports = router;