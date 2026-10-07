// backend/src/routes/appointments.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─── GET ALL APPOINTMENTS ───
router.get('/', async (req, res) => {
    try {
        const appointments = await db.query(`
            SELECT a.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   f.facility_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN facilities f ON a.facility_id = f.facility_id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `);

        res.json({
            success: true,
            data: appointments,
            count: appointments.length
        });
    } catch (error) {
        console.error('❌ Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message
        });
    }
});

// ─── GET APPOINTMENT BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const appointments = await db.query(`
            SELECT a.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   f.facility_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN facilities f ON a.facility_id = f.facility_id
            WHERE a.appointment_id = ?
        `, [req.params.id]);

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            data: appointments[0]
        });
    } catch (error) {
        console.error('❌ Get appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointment',
            error: error.message
        });
    }
});

// ─── GET APPOINTMENTS BY DATE ───
router.get('/date/:date', async (req, res) => {
    try {
        const { date } = req.params;
        console.log('📋 Fetching appointments for date:', date);
        
        const appointments = await db.query(`
            SELECT a.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   f.facility_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN facilities f ON a.facility_id = f.facility_id
            WHERE a.appointment_date = ?
            ORDER BY a.appointment_time ASC
        `, [date]);

        console.log('📋 Found appointments:', appointments.length);

        res.json({
            success: true,
            data: appointments,
            count: appointments.length
        });
    } catch (error) {
        console.error('❌ Get appointments by date error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message
        });
    }
});

// ─── CREATE APPOINTMENT ───
router.post('/', async (req, res) => {
    try {
        const {
            patient_id, facility_id, appointment_date,
            appointment_time, symptoms,
            appointment_type, notes
        } = req.body;

        console.log('📋 Creating appointment:', req.body);

        if (!patient_id || !appointment_date || !appointment_time) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID, date, and time are required'
            });
        }

        // ─── CHECK IF PATIENT EXISTS ───
        const patientCheck = await db.query(
            'SELECT patient_id, first_name, last_name FROM patients WHERE patient_id = ? AND status = "active"',
            [patient_id]
        );

        if (!patientCheck || patientCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // ─── GET FACILITY ID (default to 1 if not provided) ───
        const finalFacilityId = facility_id || 1;

        // ─── CREATE APPOINTMENT ───
        const result = await db.execute(`
            INSERT INTO appointments (
                patient_id, facility_id, 
                appointment_date, appointment_time, 
                symptoms, appointment_type, 
                status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            patient_id,
            finalFacilityId,
            appointment_date,
            appointment_time,
            symptoms || null,
            appointment_type || 'consultation',
            'scheduled',
            notes || null
        ]);

        const appointmentId = result.insertId;
        console.log('✅ Appointment created with ID:', appointmentId);

        // ─── AUTO-ADD PATIENT TO QUEUE ───
        let queueId = null;
        try {
            const existingQueue = await db.query(
                `SELECT queue_id FROM queue 
                 WHERE patient_id = ? AND status IN ('waiting', 'in_progress') 
                 AND DATE(created_at) = CURDATE()`,
                [patient_id]
            );

            if (existingQueue.length === 0) {
                const queueResult = await db.execute(`
                    INSERT INTO queue (
                        patient_id, facility_id, department_id,
                        priority_score, priority_level, status, 
                        check_in_time, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    patient_id,
                    finalFacilityId,
                    null,
                    5,
                    'normal',
                    'waiting',
                    new Date()
                ]);
                queueId = queueResult.insertId;
                console.log('✅ Patient auto-added to queue with ID:', queueId);
            } else {
                console.log('ℹ️ Patient already in queue');
                queueId = existingQueue[0].queue_id;
            }
        } catch (queueError) {
            console.error('❌ Error adding to queue:', queueError);
        }

        // ─── GET CREATED APPOINTMENT ───
        const newAppointment = await db.query(`
            SELECT a.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   f.facility_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN facilities f ON a.facility_id = f.facility_id
            WHERE a.appointment_id = ?
        `, [appointmentId]);

        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: newAppointment[0] || null,
            queueId: queueId
        });

    } catch (error) {
        console.error('❌ Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create appointment',
            error: error.message
        });
    }
});

// ─── UPDATE APPOINTMENT STATUS ───
router.put('/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { status } = req.body;

        const existing = await db.query('SELECT * FROM appointments WHERE appointment_id = ?', [appointmentId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        await db.execute(
            'UPDATE appointments SET status = ?, updated_at = NOW() WHERE appointment_id = ?',
            [status, appointmentId]
        );

        const updated = await db.query('SELECT * FROM appointments WHERE appointment_id = ?', [appointmentId]);

        res.json({
            success: true,
            message: 'Appointment updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error('❌ Update appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment',
            error: error.message
        });
    }
});

// ─── DELETE APPOINTMENT ───
router.delete('/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;

        const existing = await db.query('SELECT * FROM appointments WHERE appointment_id = ?', [appointmentId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        await db.execute('DELETE FROM appointments WHERE appointment_id = ?', [appointmentId]);

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete appointment',
            error: error.message
        });
    }
});

// ─── GET DEPARTMENTS ───
router.get('/departments', async (req, res) => {
    try {
        const departments = [
            { id: 1, name: 'General Consultation' },
            { id: 2, name: 'Maternity' },
            { id: 3, name: 'Pediatrics' },
            { id: 4, name: 'Cardiology' },
            { id: 5, name: 'Orthopedics' },
            { id: 6, name: 'Emergency' },
            { id: 7, name: 'Dermatology' },
            { id: 8, name: 'Ophthalmology' },
            { id: 9, name: 'ENT (Ear, Nose, Throat)' },
            { id: 10, name: 'Psychiatry' },
            { id: 11, name: 'Dental' },
            { id: 12, name: 'Pharmacy' },
            { id: 13, name: 'Laboratory' },
            { id: 14, name: 'Radiology' },
            { id: 15, name: 'Physiotherapy' },
            { id: 16, name: 'Nutrition' },
            { id: 17, name: 'HIV/TB Clinic' },
            { id: 18, name: 'Chronic Disease' },
            { id: 19, name: 'Antenatal' },
            { id: 20, name: 'Postnatal' }
        ];
        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('❌ Get departments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch departments',
            error: error.message
        });
    }
});

module.exports = router;