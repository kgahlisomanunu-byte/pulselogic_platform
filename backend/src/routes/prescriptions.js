// backend/src/routes/prescriptions.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ← FIXED: Removed { }

// ─── GET ALL PRESCRIPTIONS ───
router.get('/', async (req, res) => {
    try {
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   CONCAT(pat.first_name, ' ', pat.last_name) as patient_name,
                   ph.name as pharmacy_name
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
            ORDER BY p.created_at DESC
        `);

        res.json({
            success: true,
            prescriptions,
            count: prescriptions.length
        });
    } catch (error) {
        console.error('❌ Error fetching prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prescriptions',
            error: error.message
        });
    }
});

// ─── GET PRESCRIPTIONS BY PATIENT ───
router.get('/patient/:patientId', async (req, res) => {
    try {
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   ph.name as pharmacy_name
            FROM prescriptions p
            LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        `, [req.params.patientId]);

        res.json({
            success: true,
            prescriptions,
            count: prescriptions.length
        });
    } catch (error) {
        console.error('❌ Error fetching patient prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient prescriptions',
            error: error.message
        });
    }
});

// ─── CREATE NEW PRESCRIPTION ───
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            medication_name,
            dosage,
            frequency,
            duration,
            quantity,
            instructions,
            prescribing_healthcare_worker,
            pharmacy_id,
            status,
            notes,
            date_prescribed
        } = req.body;

        // Validate required fields
        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        if (!medication_name || !dosage || !frequency) {
            return res.status(400).json({
                success: false,
                message: 'Medication name, dosage, and frequency are required'
            });
        }

        if (!pharmacy_id) {
            return res.status(400).json({
                success: false,
                message: 'Pharmacy selection is required'
            });
        }

        // Insert prescription
        const [result] = await db.query(`
            INSERT INTO prescriptions (
                patient_id,
                doctor_id,
                medication_name,
                dosage,
                frequency,
                duration,
                quantity,
                instructions,
                prescribing_healthcare_worker,
                pharmacy_id,
                status,
                notes,
                date_prescribed,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            doctor_id || null,
            medication_name,
            dosage,
            frequency,
            duration || null,
            quantity || null,
            instructions || null,
            prescribing_healthcare_worker || null,
            pharmacy_id,
            status || 'prescribed',
            notes || null,
            date_prescribed || new Date().toISOString().split('T')[0]
        ]);

        const prescriptionId = result.insertId;

        res.status(201).json({
            success: true,
            message: 'Prescription created and sent to pharmacy successfully',
            prescription_id: prescriptionId
        });

    } catch (error) {
        console.error('❌ Error creating prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create prescription',
            error: error.message
        });
    }
});

// ─── UPDATE PRESCRIPTION STATUS ───
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['prescribed', 'sent_to_pharmacy', 'dispensed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM prescriptions WHERE prescription_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        await db.query(`
            UPDATE prescriptions 
            SET status = ?, updated_at = NOW()
            WHERE prescription_id = ?
        `, [status, req.params.id]);

        res.json({
            success: true,
            message: `Prescription status updated to ${status}`
        });

    } catch (error) {
        console.error('❌ Error updating prescription status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update prescription status',
            error: error.message
        });
    }
});

module.exports = router;