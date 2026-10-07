// backend/src/routes/referrals.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// ─── GET ALL REFERRALS ───
router.get('/', async (req, res) => {
    try {
        const [referrals] = await db.query(`
            SELECT r.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT(u.full_name, ' ', u.surname) AS referring_doctor,
                   f1.facility_name AS from_facility,
                   f2.facility_name AS to_facility
            FROM referrals r
            LEFT JOIN patients p ON r.patient_id = p.patient_id
            LEFT JOIN users u ON r.referring_doctor_id = u.user_id
            LEFT JOIN facilities f1 ON r.from_facility_id = f1.facility_id
            LEFT JOIN facilities f2 ON r.to_facility_id = f2.facility_id
            ORDER BY 
                CASE r.status 
                    WHEN 'pending' THEN 1
                    WHEN 'accepted' THEN 2
                    WHEN 'completed' THEN 3
                    WHEN 'cancelled' THEN 4
                    ELSE 5
                END,
                CASE r.priority
                    WHEN 'emergency' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'normal' THEN 3
                    ELSE 4
                END,
                r.created_at DESC
        `);

        res.json({
            success: true,
            referrals,
            count: referrals.length
        });
    } catch (error) {
        console.error('❌ Error fetching referrals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch referrals',
            error: error.message
        });
    }
});

// ─── GET REFERRAL BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const [referrals] = await db.query(`
            SELECT r.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT(u.full_name, ' ', u.surname) AS referring_doctor,
                   f1.facility_name AS from_facility,
                   f2.facility_name AS to_facility
            FROM referrals r
            LEFT JOIN patients p ON r.patient_id = p.patient_id
            LEFT JOIN users u ON r.referring_doctor_id = u.user_id
            LEFT JOIN facilities f1 ON r.from_facility_id = f1.facility_id
            LEFT JOIN facilities f2 ON r.to_facility_id = f2.facility_id
            WHERE r.referral_id = ?
        `, [req.params.id]);

        if (referrals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        res.json({
            success: true,
            referral: referrals[0]
        });
    } catch (error) {
        console.error('❌ Error fetching referral:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch referral',
            error: error.message
        });
    }
});

// ─── GET REFERRALS BY PATIENT ───
router.get('/patient/:patientId', async (req, res) => {
    try {
        const [referrals] = await db.query(`
            SELECT r.*,
                   CONCAT(u.full_name, ' ', u.surname) AS referring_doctor,
                   f1.facility_name AS from_facility,
                   f2.facility_name AS to_facility
            FROM referrals r
            LEFT JOIN users u ON r.referring_doctor_id = u.user_id
            LEFT JOIN facilities f1 ON r.from_facility_id = f1.facility_id
            LEFT JOIN facilities f2 ON r.to_facility_id = f2.facility_id
            WHERE r.patient_id = ?
            ORDER BY r.created_at DESC
        `, [req.params.patientId]);

        res.json({
            success: true,
            referrals,
            count: referrals.length
        });
    } catch (error) {
        console.error('❌ Error fetching patient referrals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient referrals',
            error: error.message
        });
    }
});

// ─── GET REFERRALS BY FACILITY (Hospital View) ───
router.get('/facility/:facilityId', async (req, res) => {
    try {
        const [referrals] = await db.query(`
            SELECT r.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT(u.full_name, ' ', u.surname) AS referring_doctor,
                   f1.facility_name AS from_facility
            FROM referrals r
            LEFT JOIN patients p ON r.patient_id = p.patient_id
            LEFT JOIN users u ON r.referring_doctor_id = u.user_id
            LEFT JOIN facilities f1 ON r.from_facility_id = f1.facility_id
            WHERE r.to_facility_id = ?
            ORDER BY 
                CASE r.status 
                    WHEN 'pending' THEN 1
                    WHEN 'accepted' THEN 2
                    WHEN 'completed' THEN 3
                    WHEN 'cancelled' THEN 4
                    ELSE 5
                END,
                CASE r.priority
                    WHEN 'emergency' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'normal' THEN 3
                    ELSE 4
                END,
                r.created_at DESC
        `, [req.params.facilityId]);

        res.json({
            success: true,
            referrals,
            count: referrals.length
        });
    } catch (error) {
        console.error('❌ Error fetching facility referrals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch facility referrals',
            error: error.message
        });
    }
});

// ─── CREATE NEW REFERRAL ───
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            referring_doctor_id,
            from_facility_id,
            to_facility_id,
            reason,
            diagnosis,
            clinical_notes,
            priority,
            status,
            referral_date,
            consultation_id
        } = req.body;

        // Validate required fields
        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        if (!to_facility_id) {
            return res.status(400).json({
                success: false,
                message: 'Receiving facility is required'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason for referral is required'
            });
        }

        const [result] = await db.query(`
            INSERT INTO referrals (
                patient_id,
                referring_doctor_id,
                from_facility_id,
                to_facility_id,
                reason,
                diagnosis,
                clinical_notes,
                priority,
                status,
                referral_date,
                consultation_id,
                sent_at,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            referring_doctor_id || null,
            from_facility_id || null,
            to_facility_id,
            reason,
            diagnosis || null,
            clinical_notes || null,
            priority || 'normal',
            status || 'pending',
            referral_date || new Date().toISOString().split('T')[0],
            consultation_id || null
        ]);

        const referralId = result.insertId;

        // Create notification for receiving facility
        await db.query(`
            INSERT INTO notifications (
                facility_id,
                type,
                title,
                message,
                link,
                reference_id,
                is_read,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            to_facility_id,
            'referral',
            'New Referral Received',
            `Patient has been referred to your facility. Priority: ${priority || 'normal'}`,
            `/referrals/${referralId}`,
            referralId,
            FALSE
        ]);

        res.status(201).json({
            success: true,
            message: 'Referral created and electronic medical information transferred successfully',
            referral_id: referralId
        });

    } catch (error) {
        console.error('❌ Error creating referral:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create referral',
            error: error.message
        });
    }
});

// ─── UPDATE REFERRAL STATUS ───
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'accepted', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM referrals WHERE referral_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        let updateQuery = 'UPDATE referrals SET status = ?, updated_at = NOW()';
        const queryParams = [status];

        if (status === 'accepted') {
            updateQuery += ', accepted_at = NOW()';
        } else if (status === 'completed') {
            updateQuery += ', completed_at = NOW()';
        } else if (status === 'cancelled') {
            updateQuery += ', accepted_at = NULL, completed_at = NULL';
        }

        updateQuery += ' WHERE referral_id = ?';
        queryParams.push(req.params.id);

        await db.query(updateQuery, queryParams);

        // Create notification for referring facility
        if (status === 'accepted') {
            await db.query(`
                INSERT INTO notifications (
                    facility_id,
                    type,
                    title,
                    message,
                    link,
                    reference_id,
                    is_read,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                existing[0].from_facility_id,
                'system',
                'Referral Accepted',
                `Patient has been accepted by the receiving facility.`,
                `/referrals/${req.params.id}`,
                req.params.id,
                FALSE
            ]);
        }

        res.json({
            success: true,
            message: `Referral status updated to ${status}`
        });

    } catch (error) {
        console.error('❌ Error updating referral status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update referral status',
            error: error.message
        });
    }
});

// ─── SAVE TEST RESULTS ───
router.post('/:id/test-results', async (req, res) => {
    try {
        const {
            test_name,
            test_date,
            results,
            notes,
            performed_by
        } = req.body;

        if (!test_name || !results) {
            return res.status(400).json({
                success: false,
                message: 'Test name and results are required'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM referrals WHERE referral_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        await db.query(`
            UPDATE referrals 
            SET 
                test_name = ?,
                test_date = ?,
                test_results = ?,
                test_notes = ?,
                performed_by = ?,
                results_sent_back = TRUE,
                results_sent_back_at = NOW(),
                status = 'completed',
                updated_at = NOW()
            WHERE referral_id = ?
        `, [
            test_name,
            test_date || new Date().toISOString().split('T')[0],
            results,
            notes || null,
            performed_by || null,
            req.params.id
        ]);

        // Create notification for referring facility
        await db.query(`
            INSERT INTO notifications (
                facility_id,
                type,
                title,
                message,
                link,
                reference_id,
                is_read,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            existing[0].from_facility_id,
            'test_results',
            'Test Results Available',
            `Test results for ${test_name} are now available.`,
            `/referrals/${req.params.id}`,
            req.params.id,
            FALSE
        ]);

        res.json({
            success: true,
            message: 'Test results saved and transferred back successfully'
        });

    } catch (error) {
        console.error('❌ Error saving test results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save test results',
            error: error.message
        });
    }
});

// ─── GET TEST RESULTS ───
router.get('/:id/test-results', async (req, res) => {
    try {
        const [referrals] = await db.query(`
            SELECT 
                test_name,
                test_date,
                test_results,
                test_notes,
                performed_by,
                results_sent_back,
                results_sent_back_at,
                status,
                updated_at
            FROM referrals 
            WHERE referral_id = ?
        `, [req.params.id]);

        if (referrals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        res.json({
            success: true,
            test_results: referrals[0]
        });

    } catch (error) {
        console.error('❌ Error fetching test results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test results',
            error: error.message
        });
    }
});

// ─── GET PATIENT FULL HISTORY ───
router.get('/patient-history/:patientId', async (req, res) => {
    try {
        const patientId = req.params.patientId;

        // Get patient details
        const [patient] = await db.query(`
            SELECT * FROM patients WHERE patient_id = ?
        `, [patientId]);

        if (patient.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Get consultations
        const [consultations] = await db.query(`
            SELECT c.*, 
                   CONCAT(u.full_name, ' ', u.surname) AS doctor_name
            FROM consultations c
            LEFT JOIN users u ON c.doctor_id = u.user_id
            WHERE c.patient_id = ?
            ORDER BY c.created_at DESC
        `, [patientId]);

        // Get prescriptions
        const [prescriptions] = await db.query(`
            SELECT p.*,
                   CONCAT(u.full_name, ' ', u.surname) AS doctor_name,
                   f.facility_name AS pharmacy_name
            FROM prescriptions p
            LEFT JOIN users u ON p.doctor_id = u.user_id
            LEFT JOIN facilities f ON p.pharmacy_id = f.facility_id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        `, [patientId]);

        // Get referrals (complete history)
        const [referrals] = await db.query(`
            SELECT r.*,
                   CONCAT(u.full_name, ' ', u.surname) AS referring_doctor,
                   f1.facility_name AS from_facility,
                   f2.facility_name AS to_facility
            FROM referrals r
            LEFT JOIN users u ON r.referring_doctor_id = u.user_id
            LEFT JOIN facilities f1 ON r.from_facility_id = f1.facility_id
            LEFT JOIN facilities f2 ON r.to_facility_id = f2.facility_id
            WHERE r.patient_id = ?
            ORDER BY r.created_at DESC
        `, [patientId]);

        // Get vitals
        const [vitals] = await db.query(`
            SELECT * FROM vitals WHERE patient_id = ?
            ORDER BY recorded_at DESC
            LIMIT 10
        `, [patientId]);

        // Get visits
        const [visits] = await db.query(`
            SELECT * FROM patient_visits 
            WHERE patient_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `, [patientId]);

        res.json({
            success: true,
            patient: patient[0],
            consultations,
            prescriptions,
            referrals,
            vitals,
            visits,
            stats: {
                total_consultations: consultations.length,
                total_prescriptions: prescriptions.length,
                total_referrals: referrals.length,
                total_visits: visits.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching patient history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient history',
            error: error.message
        });
    }
});

module.exports = router;