// backend/src/routes/vitals.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ═══════════════════════════════════════════════════════
// GET ALL VITALS
// ═══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const vitals = await db.query(`
            SELECT 
                v.*,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name
            FROM vitals v
            LEFT JOIN patients p ON v.patient_id = p.patient_id
            ORDER BY v.recorded_at DESC
            LIMIT 500
        `);

        res.json({
            success: true,
            vitals: vitals || [],
            data: vitals || [],
            count: (vitals || []).length
        });
    } catch (error) {
        console.error('❌ Get vitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vitals',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════
// GET VITALS BY PATIENT
// ═══════════════════════════════════════════════════════
router.get('/patient/:patientId', async (req, res) => {
    try {
        const vitals = await db.query(`
            SELECT 
                v.*,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name
            FROM vitals v
            LEFT JOIN patients p ON v.patient_id = p.patient_id
            WHERE v.patient_id = ?
            ORDER BY v.recorded_at DESC
        `, [req.params.patientId]);

        res.json({
            success: true,
            vitals: vitals || [],
            data: vitals || [],
            count: (vitals || []).length
        });
    } catch (error) {
        console.error('❌ Get patient vitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient vitals',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════
// GET SINGLE VITAL BY ID
// ═══════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
    try {
        const vitals = await db.query(`
            SELECT 
                v.*,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name
            FROM vitals v
            LEFT JOIN patients p ON v.patient_id = p.patient_id
            WHERE v.vital_id = ?
        `, [req.params.id]);

        if (vitals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vital record not found'
            });
        }

        res.json({
            success: true,
            data: vitals[0]
        });
    } catch (error) {
        console.error('❌ Get vital error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vital',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════
// CREATE NEW VITAL
// ═══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            temperature,
            heart_rate,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            oxygen_saturation,
            blood_glucose,
            weight,
            height,
            respiratory_rate,
            pain_score,
            symptoms,
            notes,
            recorded_by
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        // Check patient exists
        const patientCheck = await db.query(
            'SELECT patient_id FROM patients WHERE patient_id = ?',
            [patient_id]
        );

        if (patientCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const result = await db.execute(`
            INSERT INTO vitals (
                patient_id, temperature, heart_rate,
                blood_pressure_systolic, blood_pressure_diastolic,
                oxygen_saturation, blood_glucose, weight, height,
                respiratory_rate, pain_score, symptoms, notes,
                recorded_by, recorded_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            temperature || null,
            heart_rate || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            oxygen_saturation || null,
            blood_glucose || null,
            weight || null,
            height || null,
            respiratory_rate || null,
            pain_score || null,
            symptoms || null,
            notes || null,
            recorded_by || 1
        ]);

        const vitalId = result.insertId;
        console.log(`✅ Vitals recorded (ID: ${vitalId}) for patient ${patient_id}`);

        const newVital = await db.query(`
            SELECT 
                v.*,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name
            FROM vitals v
            LEFT JOIN patients p ON v.patient_id = p.patient_id
            WHERE v.vital_id = ?
        `, [vitalId]);

        res.status(201).json({
            success: true,
            message: 'Vitals recorded successfully',
            data: newVital[0] || null
        });

    } catch (error) {
        console.error('❌ Create vital error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record vitals',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════
// UPDATE VITAL
// ═══════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
    try {
        const vitalId = req.params.id;
        const {
            temperature,
            heart_rate,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            oxygen_saturation,
            blood_glucose,
            weight,
            height,
            respiratory_rate,
            pain_score,
            symptoms,
            notes
        } = req.body;

        const existing = await db.query(
            'SELECT vital_id FROM vitals WHERE vital_id = ?',
            [vitalId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vital record not found'
            });
        }

        await db.execute(`
            UPDATE vitals SET
                temperature = COALESCE(?, temperature),
                heart_rate = COALESCE(?, heart_rate),
                blood_pressure_systolic = COALESCE(?, blood_pressure_systolic),
                blood_pressure_diastolic = COALESCE(?, blood_pressure_diastolic),
                oxygen_saturation = COALESCE(?, oxygen_saturation),
                blood_glucose = COALESCE(?, blood_glucose),
                weight = COALESCE(?, weight),
                height = COALESCE(?, height),
                respiratory_rate = COALESCE(?, respiratory_rate),
                pain_score = COALESCE(?, pain_score),
                symptoms = COALESCE(?, symptoms),
                notes = COALESCE(?, notes)
            WHERE vital_id = ?
        `, [
            temperature, heart_rate,
            blood_pressure_systolic, blood_pressure_diastolic,
            oxygen_saturation, blood_glucose,
            weight, height, respiratory_rate, pain_score,
            symptoms, notes, vitalId
        ]);

        const updated = await db.query(
            'SELECT * FROM vitals WHERE vital_id = ?',
            [vitalId]
        );

        res.json({
            success: true,
            message: 'Vital updated successfully',
            data: updated[0] || null
        });

    } catch (error) {
        console.error('❌ Update vital error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update vital',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════
// DELETE VITAL
// ═══════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    try {
        const vitalId = req.params.id;

        const existing = await db.query(
            'SELECT vital_id FROM vitals WHERE vital_id = ?',
            [vitalId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vital record not found'
            });
        }

        await db.execute('DELETE FROM vitals WHERE vital_id = ?', [vitalId]);

        res.json({
            success: true,
            message: 'Vital deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete vital error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete vital',
            error: error.message
        });
    }
});

module.exports = router;