// backend/src/routes/consultations.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// ─── GET ALL CONSULTATIONS ───
router.get('/', async (req, res) => {
    try {
        const [consultations] = await db.query(`
            SELECT c.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   CONCAT(u.full_name) as doctor_name
            FROM consultations c
            LEFT JOIN patients p ON c.patient_id = p.patient_id
            LEFT JOIN users u ON c.doctor_id = u.user_id
            ORDER BY c.created_at DESC
        `);

        res.json({
            success: true,
            consultations,
            count: consultations.length
        });
    } catch (error) {
        console.error('❌ Error fetching consultations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch consultations',
            error: error.message
        });
    }
});

// ─── GET CONSULTATION BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const [consultations] = await db.query(`
            SELECT c.*,
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   CONCAT(u.full_name) as doctor_name
            FROM consultations c
            LEFT JOIN patients p ON c.patient_id = p.patient_id
            LEFT JOIN users u ON c.doctor_id = u.user_id
            WHERE c.consultation_id = ?
        `, [req.params.id]);

        if (consultations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consultation not found'
            });
        }

        res.json({
            success: true,
            consultation: consultations[0]
        });
    } catch (error) {
        console.error('❌ Error fetching consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch consultation',
            error: error.message
        });
    }
});

// ─── GET CONSULTATIONS BY PATIENT ───
router.get('/patient/:patientId', async (req, res) => {
    try {
        const [consultations] = await db.query(`
            SELECT c.*,
                   CONCAT(u.full_name) as doctor_name
            FROM consultations c
            LEFT JOIN users u ON c.doctor_id = u.user_id
            WHERE c.patient_id = ?
            ORDER BY c.created_at DESC
        `, [req.params.patientId]);

        res.json({
            success: true,
            consultations,
            count: consultations.length
        });
    } catch (error) {
        console.error('❌ Error fetching patient consultations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient consultations',
            error: error.message
        });
    }
});

// ─── CREATE NEW CONSULTATION ───
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            subjective,
            objective,
            assessment,
            plan,
            diagnosis,
            final_diagnosis,
            treatment_decision,
            notes,
            lab_requests,
            radiology_requests,
            other_investigations,
            requires_referral,
            referral_reason,
            referral_priority
        } = req.body;

        // Validate required fields
        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        if (!subjective || !objective || !assessment || !plan || !diagnosis) {
            return res.status(400).json({
                success: false,
                message: 'Missing required consultation fields'
            });
        }

        const [result] = await db.query(`
            INSERT INTO consultations (
                patient_id,
                doctor_id,
                subjective,
                objective,
                assessment,
                plan,
                diagnosis,
                final_diagnosis,
                treatment_decision,
                notes,
                lab_requests,
                radiology_requests,
                other_investigations,
                requires_referral,
                referral_reason,
                referral_priority,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            doctor_id || null,
            subjective,
            objective,
            assessment,
            plan,
            diagnosis,
            final_diagnosis || null,
            treatment_decision || null,
            notes || null,
            lab_requests ? JSON.stringify(lab_requests) : null,
            radiology_requests ? JSON.stringify(radiology_requests) : null,
            other_investigations ? JSON.stringify(other_investigations) : null,
            requires_referral || false,
            referral_reason || null,
            referral_priority || 'normal'
        ]);

        const consultationId = result.insertId;

        res.status(201).json({
            success: true,
            message: 'Consultation created successfully',
            consultation_id: consultationId
        });

    } catch (error) {
        console.error('❌ Error creating consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create consultation',
            error: error.message
        });
    }
});

// ─── UPDATE CONSULTATION ───
router.put('/:id', async (req, res) => {
    try {
        const {
            subjective,
            objective,
            assessment,
            plan,
            diagnosis,
            final_diagnosis,
            treatment_decision,
            notes,
            status
        } = req.body;

        const [existing] = await db.query(
            'SELECT * FROM consultations WHERE consultation_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consultation not found'
            });
        }

        await db.query(`
            UPDATE consultations SET
                subjective = ?,
                objective = ?,
                assessment = ?,
                plan = ?,
                diagnosis = ?,
                final_diagnosis = ?,
                treatment_decision = ?,
                notes = ?,
                status = ?,
                updated_at = NOW()
            WHERE consultation_id = ?
        `, [
            subjective || existing[0].subjective,
            objective || existing[0].objective,
            assessment || existing[0].assessment,
            plan || existing[0].plan,
            diagnosis || existing[0].diagnosis,
            final_diagnosis || existing[0].final_diagnosis,
            treatment_decision || existing[0].treatment_decision,
            notes || existing[0].notes,
            status || existing[0].status,
            req.params.id
        ]);

        res.json({
            success: true,
            message: 'Consultation updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update consultation',
            error: error.message
        });
    }
});

// ─── DELETE CONSULTATION ───
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await db.query(
            'SELECT * FROM consultations WHERE consultation_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Consultation not found'
            });
        }

        await db.query(
            'DELETE FROM consultations WHERE consultation_id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Consultation deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete consultation',
            error: error.message
        });
    }
});

module.exports = router;