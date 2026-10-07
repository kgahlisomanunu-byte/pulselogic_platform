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
                   CONCAT(u.full_name, ' ', u.surname) as doctor_name,
                   ph.name as pharmacy_name,
                   ph.address as pharmacy_address
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            LEFT JOIN users u ON p.doctor_id = u.user_id
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

// ─── GET PRESCRIPTION BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   CONCAT(pat.first_name, ' ', pat.last_name) as patient_name,
                   CONCAT(u.full_name, ' ', u.surname) as doctor_name,
                   ph.name as pharmacy_name,
                   ph.address as pharmacy_address
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            LEFT JOIN users u ON p.doctor_id = u.user_id
            LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
            WHERE p.prescription_id = ?
        `, [req.params.id]);

        if (prescriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        res.json({
            success: true,
            prescription: prescriptions[0]
        });
    } catch (error) {
        console.error('❌ Error fetching prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prescription',
            error: error.message
        });
    }
});

// ─── GET PRESCRIPTIONS BY PATIENT ───
router.get('/patient/:patientId', async (req, res) => {
    try {
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   CONCAT(u.full_name, ' ', u.surname) as doctor_name,
                   ph.name as pharmacy_name,
                   ph.address as pharmacy_address
            FROM prescriptions p
            LEFT JOIN users u ON p.doctor_id = u.user_id
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

// ─── GET PRESCRIPTIONS BY PHARMACY ───
router.get('/pharmacy/:pharmacyId', async (req, res) => {
    try {
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   CONCAT(pat.first_name, ' ', pat.last_name) as patient_name,
                   CONCAT(u.full_name, ' ', u.surname) as doctor_name
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            LEFT JOIN users u ON p.doctor_id = u.user_id
            WHERE p.pharmacy_id = ?
            ORDER BY p.created_at DESC
        `, [req.params.pharmacyId]);

        res.json({
            success: true,
            prescriptions,
            count: prescriptions.length
        });
    } catch (error) {
        console.error('❌ Error fetching pharmacy prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pharmacy prescriptions',
            error: error.message
        });
    }
});

// ─── GET PHARMACY PRESCRIPTIONS (For Pharmacy Dashboard) ───
router.get('/pharmacy-dashboard/:pharmacyId', async (req, res) => {
    try {
        const pharmacyId = req.params.pharmacyId;

        // Get all prescriptions for this pharmacy
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   CONCAT(pat.first_name, ' ', pat.last_name) as patient_name,
                   CONCAT(u.full_name, ' ', u.surname) as doctor_name
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            LEFT JOIN users u ON p.doctor_id = u.user_id
            WHERE p.pharmacy_id = ?
            ORDER BY 
                CASE 
                    WHEN p.status = 'sent_to_pharmacy' THEN 1
                    WHEN p.status = 'prescribed' THEN 2
                    WHEN p.status = 'dispensed' THEN 3
                    WHEN p.status = 'completed' THEN 4
                    ELSE 5
                END,
                p.created_at DESC
        `, [pharmacyId]);

        // Get statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('prescribed', 'sent_to_pharmacy') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'dispensed' THEN 1 ELSE 0 END) as dispensed,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM prescriptions
            WHERE pharmacy_id = ?
        `, [pharmacyId]);

        res.json({
            success: true,
            prescriptions,
            stats: stats[0] || { total: 0, pending: 0, dispensed: 0, completed: 0 }
        });
    } catch (error) {
        console.error('❌ Error fetching pharmacy dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pharmacy dashboard',
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

// ─── UPDATE PRESCRIPTION ───
router.put('/:id', async (req, res) => {
    try {
        const {
            medication_name,
            dosage,
            frequency,
            duration,
            quantity,
            instructions,
            prescribing_healthcare_worker,
            pharmacy_id,
            status,
            notes
        } = req.body;

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
            UPDATE prescriptions SET
                medication_name = ?,
                dosage = ?,
                frequency = ?,
                duration = ?,
                quantity = ?,
                instructions = ?,
                prescribing_healthcare_worker = ?,
                pharmacy_id = ?,
                status = ?,
                notes = ?,
                updated_at = NOW()
            WHERE prescription_id = ?
        `, [
            medication_name || existing[0].medication_name,
            dosage || existing[0].dosage,
            frequency || existing[0].frequency,
            duration || existing[0].duration,
            quantity || existing[0].quantity,
            instructions || existing[0].instructions,
            prescribing_healthcare_worker || existing[0].prescribing_healthcare_worker,
            pharmacy_id || existing[0].pharmacy_id,
            status || existing[0].status,
            notes || existing[0].notes,
            req.params.id
        ]);

        res.json({
            success: true,
            message: 'Prescription updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update prescription',
            error: error.message
        });
    }
});

// ─── UPDATE PRESCRIPTION STATUS ───
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, dispensed_by, dispensed_date, notes } = req.body;

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
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
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

        // Build update query
        let updateQuery = 'UPDATE prescriptions SET status = ?, updated_at = NOW()';
        const queryParams = [status];

        // If dispensing, add dispensed_by and dispensed_date
        if (status === 'dispensed' || status === 'completed') {
            if (dispensed_by) {
                updateQuery += ', dispensed_by = ?';
                queryParams.push(dispensed_by);
            }
            if (dispensed_date) {
                updateQuery += ', dispensed_date = ?';
                queryParams.push(dispensed_date);
            } else {
                updateQuery += ', dispensed_date = CURDATE()';
            }
        }

        if (notes) {
            updateQuery += ', notes = ?';
            queryParams.push(notes);
        }

        updateQuery += ' WHERE prescription_id = ?';
        queryParams.push(req.params.id);

        await db.query(updateQuery, queryParams);

        // Get updated prescription
        const [updated] = await db.query(`
            SELECT p.*,
                   CONCAT(pat.first_name, ' ', pat.last_name) as patient_name,
                   ph.name as pharmacy_name
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
            WHERE p.prescription_id = ?
        `, [req.params.id]);

        res.json({
            success: true,
            message: `Prescription status updated to ${status}`,
            prescription: updated[0]
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

// ─── DISPENSE PRESCRIPTION (Pharmacy specific) ───
router.post('/:id/dispense', async (req, res) => {
    try {
        const { dispensed_by, dispensed_date, notes } = req.body;

        if (!dispensed_by) {
            return res.status(400).json({
                success: false,
                message: 'Pharmacist name is required'
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

        // Check if prescription can be dispensed
        if (existing[0].status === 'dispensed' || existing[0].status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Prescription has already been dispensed'
            });
        }

        if (existing[0].status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot dispense a cancelled prescription'
            });
        }

        await db.query(`
            UPDATE prescriptions SET
                status = 'dispensed',
                dispensed_by = ?,
                dispensed_date = ?,
                notes = CONCAT(IFNULL(notes, ''), '\n', ?),
                updated_at = NOW()
            WHERE prescription_id = ?
        `, [
            dispensed_by,
            dispensed_date || new Date().toISOString().split('T')[0],
            notes ? `Dispensed: ${notes}` : 'Dispensed',
            req.params.id
        ]);

        res.json({
            success: true,
            message: 'Prescription dispensed successfully',
            dispensed_by: dispensed_by,
            dispensed_date: dispensed_date || new Date().toISOString().split('T')[0]
        });

    } catch (error) {
        console.error('❌ Error dispensing prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to dispense prescription',
            error: error.message
        });
    }
});

// ─── GET PHARMACY STATISTICS ───
router.get('/pharmacy-stats/:pharmacyId', async (req, res) => {
    try {
        const pharmacyId = req.params.pharmacyId;

        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('prescribed', 'sent_to_pharmacy') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'dispensed' THEN 1 ELSE 0 END) as dispensed,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today
            FROM prescriptions
            WHERE pharmacy_id = ?
        `, [pharmacyId]);

        // Get recent activity
        const [recent] = await db.query(`
            SELECT 
                p.*,
                CONCAT(pat.first_name, ' ', pat.last_name) as patient_name
            FROM prescriptions p
            LEFT JOIN patients pat ON p.patient_id = pat.patient_id
            WHERE p.pharmacy_id = ?
            ORDER BY p.updated_at DESC
            LIMIT 10
        `, [pharmacyId]);

        res.json({
            success: true,
            stats: stats[0] || { total: 0, pending: 0, dispensed: 0, completed: 0, cancelled: 0, today: 0 },
            recent
        });

    } catch (error) {
        console.error('❌ Error fetching pharmacy stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pharmacy statistics',
            error: error.message
        });
    }
});

// ─── DELETE PRESCRIPTION ───
router.delete('/:id', async (req, res) => {
    try {
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

        await db.query(
            'DELETE FROM prescriptions WHERE prescription_id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Prescription deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete prescription',
            error: error.message
        });
    }
});

module.exports = router;