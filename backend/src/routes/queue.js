// backend/src/routes/queue.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET ALL QUEUE ENTRIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/', async (req, res) => {
    try {
        console.log('ðŸ“‹ Fetching queue entries...');

        const queue = await db.query(`
            SELECT 
                q.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_code,
                p.phone_number,
                p.age,
                p.preferred_language,
                COALESCE(q.waiting_time_minutes, 
                    TIMESTAMPDIFF(MINUTE, q.check_in_time, NOW())
                ) AS wait_minutes
            FROM queue q
            LEFT JOIN patients p ON q.patient_id = p.patient_id
            ORDER BY 
                CASE q.priority_level
                    WHEN 'emergency' THEN 1
                    WHEN 'critical' THEN 2
                    WHEN 'urgent' THEN 3
                    WHEN 'normal' THEN 4
                    ELSE 5
                END,
                q.check_in_time ASC
        `);

        console.log(`âœ… Found ${queue.length} queue entries`);

        res.json({
            success: true,
            data: queue || [],
            count: (queue || []).length
        });
    } catch (error) {
        console.error('âŒ Get queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue',
            error: error.message
        });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET QUEUE BY ID
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/:id', async (req, res) => {
    try {
        const queue = await db.query(`
            SELECT 
                q.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_code,
                p.phone_number
            FROM queue q
            LEFT JOIN patients p ON q.patient_id = p.patient_id
            WHERE q.queue_id = ?
        `, [req.params.id]);

        if (queue.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Queue entry not found'
            });
        }

        res.json({
            success: true,
            data: queue[0]
        });
    } catch (error) {
        console.error('âŒ Get queue entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue entry',
            error: error.message
        });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADD TO QUEUE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            visit_id,
            facility_id = 1,
            department_id,
            priority_score = 0,
            priority_level = 'normal',
            status = 'waiting'
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

        // Check if already in queue
        const existing = await db.query(
            `SELECT queue_id FROM queue 
             WHERE patient_id = ? AND status IN ('waiting', 'in_progress')`,
            [patient_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Patient is already in the queue',
                data: existing[0]
            });
        }

        // visit_id is required (NOT NULL)
        // If not provided, create a basic visit or use patient_id-based fallback
        const finalVisitId = visit_id || 1;

        const result = await db.execute(`
            INSERT INTO queue (
                patient_id, visit_id, facility_id, department_id,
                priority_score, priority_level, status,
                check_in_time, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            finalVisitId,
            facility_id,
            department_id || null,
            priority_score,
            priority_level,
            status
        ]);

        const queueId = result.insertId;
        console.log(`âœ… Patient ${patient_id} added to queue (ID: ${queueId})`);

        const newEntry = await db.query(`
            SELECT 
                q.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_code
            FROM queue q
            LEFT JOIN patients p ON q.patient_id = p.patient_id
            WHERE q.queue_id = ?
        `, [queueId]);

        res.status(201).json({
            success: true,
            message: 'Patient added to queue successfully',
            data: newEntry[0] || null
        });

    } catch (error) {
        console.error('âŒ Add to queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add patient to queue',
            error: error.message
        });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UPDATE QUEUE STATUS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.put('/:id', async (req, res) => {
    try {
        const queueId = req.params.id;
        const { status, priority_level, assigned_nurse_id, assigned_doctor_id } = req.body;

        const existing = await db.query(
            'SELECT queue_id FROM queue WHERE queue_id = ?',
            [queueId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Queue entry not found'
            });
        }

        const updates = [];
        const values = [];

        if (status) {
            updates.push('status = ?');
            values.push(status);

            // Set time markers based on status
            if (status === 'in_progress') {
                updates.push('nurse_start_time = COALESCE(nurse_start_time, NOW())');
            }
            if (status === 'completed') {
                updates.push('nurse_end_time = COALESCE(nurse_end_time, NOW())');
                updates.push('waiting_time_minutes = TIMESTAMPDIFF(MINUTE, check_in_time, NOW())');
            }
        }

        if (priority_level) {
            updates.push('priority_level = ?');
            values.push(priority_level);
        }

        if (assigned_nurse_id !== undefined) {
            updates.push('assigned_nurse_id = ?');
            values.push(assigned_nurse_id || null);
        }

        if (assigned_doctor_id !== undefined) {
            updates.push('assigned_doctor_id = ?');
            values.push(assigned_doctor_id || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(queueId);

        await db.execute(`
            UPDATE queue 
            SET ${updates.join(', ')}
            WHERE queue_id = ?
        `, values);

        const updated = await db.query(`
            SELECT 
                q.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name
            FROM queue q
            LEFT JOIN patients p ON q.patient_id = p.patient_id
            WHERE q.queue_id = ?
        `, [queueId]);

        res.json({
            success: true,
            message: 'Queue updated successfully',
            data: updated[0] || null
        });

    } catch (error) {
        console.error('âŒ Update queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update queue',
            error: error.message
        });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DELETE QUEUE ENTRY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.delete('/:id', async (req, res) => {
    try {
        const queueId = req.params.id;

        const existing = await db.query(
            'SELECT queue_id FROM queue WHERE queue_id = ?',
            [queueId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Queue entry not found'
            });
        }

        await db.execute('DELETE FROM queue WHERE queue_id = ?', [queueId]);

        res.json({
            success: true,
            message: 'Queue entry deleted successfully'
        });

    } catch (error) {
        console.error('âŒ Delete queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete queue entry',
            error: error.message
        });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET QUEUE STATISTICS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN priority_level = 'emergency' THEN 1 ELSE 0 END) AS emergency,
                SUM(CASE WHEN priority_level = 'critical' THEN 1 ELSE 0 END) AS critical,
                SUM(CASE WHEN priority_level = 'urgent' THEN 1 ELSE 0 END) AS urgent,
                SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) AS waiting,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
                AVG(waiting_time_minutes) AS avg_wait_time
            FROM queue
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        res.json({
            success: true,
            data: stats[0] || {
                total: 0, emergency: 0, critical: 0, urgent: 0,
                waiting: 0, in_progress: 0, completed: 0, cancelled: 0,
                avg_wait_time: 0
            }
        });
    } catch (error) {
        console.error('âŒ Get queue stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue statistics',
            error: error.message
        });
    }
});

module.exports = router;