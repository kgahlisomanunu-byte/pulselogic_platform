// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ← FIXED: Removed destructuring

// ─── HELPER: Safe query execution ───
const safeQuery = async (sql, params = []) => {
    try {
        const result = await db.query(sql, params);
        return result || [];
    } catch (error) {
        console.log(`ℹ️ Query warning: ${error.message}`);
        return [];
    }
};

// ─── GET DASHBOARD STATISTICS ───
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Fetching dashboard stats...');

        // Get all stats in parallel for better performance
        const [
            patientsToday,
            critical,
            inQueue,
            attended,
            appointments,
            escalated,
            overdue,
            totalPatients,
            totalVisits
        ] = await Promise.all([
            safeQuery("SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = CURDATE()"),
            safeQuery("SELECT COUNT(*) as count FROM queue WHERE priority_level IN ('emergency', 'critical') AND status = 'waiting'"),
            safeQuery("SELECT COUNT(*) as count FROM queue WHERE status = 'waiting'"),
            safeQuery("SELECT COUNT(*) as count FROM patient_visits WHERE status = 'completed' AND DATE(created_at) = CURDATE()"),
            safeQuery("SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURDATE()"),
            safeQuery("SELECT COUNT(*) as count FROM queue WHERE waiting_time_minutes > 30 AND status = 'waiting'"),
            safeQuery("SELECT COUNT(*) as count FROM queue WHERE waiting_time_minutes > 60 AND status = 'waiting'"),
            safeQuery("SELECT COUNT(*) as count FROM patients"),
            safeQuery("SELECT COUNT(*) as count FROM patient_visits")
        ]);

        res.json({
            success: true,
            data: {
                patientsToday: patientsToday[0]?.count || 0,
                critical: critical[0]?.count || 0,
                inQueue: inQueue[0]?.count || 0,
                attended: attended[0]?.count || 0,
                appointments: appointments[0]?.count || 0,
                escalated: escalated[0]?.count || 0,
                overdue: overdue[0]?.count || 0,
                totalPatients: totalPatients[0]?.count || 0,
                totalVisits: totalVisits[0]?.count || 0
            }
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
});

// ─── GET DISEASE/CONDITION COUNTS ───
router.get('/conditions', async (req, res) => {
    try {
        const conditions = [
            { name: 'Hypertension', icon: 'fa-heart', color: '#EF4444' },
            { name: 'Hypotension', icon: 'fa-heartbeat', color: '#F59E0B' },
            { name: 'Heart Failure', icon: 'fa-heart-pulse', color: '#EF4444' },
            { name: 'Coronary Artery Disease', icon: 'fa-artery', color: '#F59E0B' },
            { name: 'Cardiac Arrhythmias', icon: 'fa-wave-square', color: '#F59E0B' },
            { name: 'Tachycardia', icon: 'fa-heart-circle-exclamation', color: '#EF4444' },
            { name: 'Bradycardia', icon: 'fa-heart-circle-minus', color: '#10B981' },
            { name: 'Stroke Risk', icon: 'fa-brain', color: '#F59E0B' },
            { name: 'Asthma', icon: 'fa-lungs', color: '#F59E0B' },
            { name: 'Diabetes', icon: 'fa-droplet', color: '#F59E0B' },
            { name: 'Cardiac', icon: 'fa-heart', color: '#EF4444' },
            { name: 'Obesity', icon: 'fa-weight-scale', color: '#10B981' },
            { name: 'Pneumonia', icon: 'fa-lungs-virus', color: '#0EA5E9' },
            { name: 'HIV', icon: 'fa-virus', color: '#0EA5E9' },
            { name: 'TB', icon: 'fa-lungs', color: '#F59E0B' },
            { name: 'Anaemia', icon: 'fa-droplet', color: '#F59E0B' },
        ];
        
        let results = [];
        for (const condition of conditions) {
            const rows = await safeQuery(
                "SELECT COUNT(*) as count FROM diagnoses WHERE diagnosis LIKE ? OR icd10_code = ?",
                [`%${condition.name}%`, condition.name]
            );
            const count = rows[0]?.count || 0;
            
            let status = 'normal';
            if (count > 5) status = 'critical';
            else if (count > 2) status = 'warning';
            else if (count > 0) status = 'monitoring';
            
            results.push({
                ...condition,
                count: count,
                status: status
            });
        }
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('❌ Error fetching conditions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conditions',
            error: error.message
        });
    }
});

// ─── GET MATERNITY DATA ───
router.get('/maternity', async (req, res) => {
    try {
        const [total, highRisk, labour, postnatal, antenatal] = await Promise.all([
            safeQuery("SELECT COUNT(*) as count FROM maternity_records WHERE status = 'active'"),
            safeQuery("SELECT COUNT(*) as count FROM maternity_records WHERE referral_alert = TRUE"),
            safeQuery("SELECT COUNT(*) as count FROM maternity_records WHERE labour_stage IS NOT NULL AND labour_stage != ''"),
            safeQuery("SELECT COUNT(*) as count FROM maternity_records WHERE delivery_date IS NOT NULL"),
            safeQuery("SELECT COUNT(*) as count FROM maternity_records WHERE expected_due_date IS NOT NULL AND delivery_date IS NULL")
        ]);

        const maternityConditions = [
            { name: 'Pregnancy', icon: 'fa-baby', color: '#8B5CF6', status: 'completed', count: total[0]?.count || 0 },
            { name: 'Gestational Age', icon: 'fa-calendar-week', color: '#0EA5E9', status: 'monitoring', count: antenatal[0]?.count || 0 },
            { name: 'Due Date', icon: 'fa-calendar-day', color: '#0EA5E9', status: 'monitoring', count: antenatal[0]?.count || 0 },
            { name: 'Gestational Hypertension', icon: 'fa-heart', color: '#F59E0B', status: 'warning', count: 0 },
            { name: 'Gestational Diabetes', icon: 'fa-droplet', color: '#F59E0B', status: 'warning', count: 0 },
            { name: 'Pre-eclampsia Risk', icon: 'fa-triangle-exclamation', color: '#DC2626', status: 'emergency', count: highRisk[0]?.count || 0 },
            { name: 'Reduced Fetal Movement', icon: 'fa-fetus', color: '#DC2626', status: 'emergency', count: 0 },
            { name: 'Premature Labour Risk', icon: 'fa-clock', color: '#F59E0B', status: 'warning', count: 0 },
            { name: 'Postnatal Recovery', icon: 'fa-bed', color: '#0EA5E9', status: 'monitoring', count: postnatal[0]?.count || 0 },
            { name: 'Breastfeeding', icon: 'fa-baby', color: '#8B5CF6', status: 'pending', count: 0 },
            { name: 'Newborn', icon: 'fa-star', color: '#10B981', status: 'completed', count: 0 },
        ];

        res.json({
            success: true,
            data: maternityConditions
        });
    } catch (error) {
        console.error('❌ Error fetching maternity data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maternity data',
            error: error.message
        });
    }
});

// ─── GET QUEUE SNAPSHOT ───
router.get('/queue', async (req, res) => {
    try {
        const queueData = await safeQuery(`
            SELECT 
                CONCAT(p.first_name, ' ', p.last_name) as patient,
                q.priority_score as score,
                q.priority_level as priority,
                CONCAT(q.waiting_time_minutes, ' min') as waiting,
                d.diagnosis as condition,
                'N/A' as tests
            FROM queue q
            JOIN patients p ON q.patient_id = p.patient_id
            LEFT JOIN diagnoses d ON q.visit_id = d.visit_id
            WHERE q.status = 'waiting'
            ORDER BY q.priority_score DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            data: queueData
        });
    } catch (error) {
        console.error('❌ Error fetching queue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue data',
            error: error.message
        });
    }
});

// ─── GET RECENT PATIENTS ───
router.get('/recent-patients', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const patients = await safeQuery(
            `SELECT patient_id, first_name, last_name, phone_number, created_at 
             FROM patients 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [limit]
        );
        
        res.json({
            success: true,
            patients: patients || []
        });
    } catch (error) {
        console.error('❌ Recent patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent patients',
            error: error.message
        });
    }
});

// ─── GET PATIENT VISITS OVERVIEW ───
router.get('/visits-overview', async (req, res) => {
    try {
        const visitsByDay = await safeQuery(`
            SELECT 
                DAYNAME(visit_date) as day,
                COUNT(*) as count
            FROM patient_visits
            WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DAYNAME(visit_date)
            ORDER BY FIELD(DAYNAME(visit_date), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        `);

        res.json({
            success: true,
            data: {
                visitsByDay: visitsByDay || []
            }
        });
    } catch (error) {
        console.error('❌ Visits overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get visits overview',
            error: error.message
        });
    }
});

// ─── GET GENDER STATISTICS ───
router.get('/gender-stats', async (req, res) => {
    try {
        const genderStats = await safeQuery(
            'SELECT gender, COUNT(*) as count FROM patients WHERE gender IS NOT NULL GROUP BY gender'
        );

        res.json({
            success: true,
            data: genderStats || []
        });
    } catch (error) {
        console.error('❌ Gender stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get gender statistics',
            error: error.message
        });
    }
});

// ─── GET PROVINCE STATISTICS ───
router.get('/province-stats', async (req, res) => {
    try {
        const provinceStats = await safeQuery(
            'SELECT province, COUNT(*) as count FROM patients WHERE province IS NOT NULL GROUP BY province'
        );

        res.json({
            success: true,
            data: provinceStats || []
        });
    } catch (error) {
        console.error('❌ Province stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get province statistics',
            error: error.message
        });
    }
});

// ─── GET DASHBOARD SUMMARY (All Stats in One Call) ───
router.get('/summary', async (req, res) => {
    try {
        const [
            totalPatients,
            patientsToday,
            inQueue,
            critical,
            attended,
            appointments,
            genderStats,
            provinceStats,
            recentPatients
        ] = await Promise.all([
            safeQuery("SELECT COUNT(*) as count FROM patients"),
            safeQuery("SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = CURDATE()"),
            safeQuery("SELECT COUNT(*) as count FROM queue WHERE status = 'waiting'"),
            safeQuery("SELECT COUNT(*) as count FROM queue WHERE priority_level IN ('emergency', 'critical') AND status = 'waiting'"),
            safeQuery("SELECT COUNT(*) as count FROM patient_visits WHERE status = 'completed' AND DATE(created_at) = CURDATE()"),
            safeQuery("SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURDATE()"),
            safeQuery("SELECT gender, COUNT(*) as count FROM patients WHERE gender IS NOT NULL GROUP BY gender"),
            safeQuery("SELECT province, COUNT(*) as count FROM patients WHERE province IS NOT NULL GROUP BY province"),
            safeQuery("SELECT patient_id, first_name, last_name, phone_number, created_at FROM patients ORDER BY created_at DESC LIMIT 5")
        ]);

        res.json({
            success: true,
            data: {
                totalPatients: totalPatients[0]?.count || 0,
                patientsToday: patientsToday[0]?.count || 0,
                inQueue: inQueue[0]?.count || 0,
                critical: critical[0]?.count || 0,
                attended: attended[0]?.count || 0,
                appointments: appointments[0]?.count || 0,
                byGender: genderStats || [],
                byProvince: provinceStats || [],
                recentPatients: recentPatients || []
            }
        });
    } catch (error) {
        console.error('❌ Dashboard summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard summary',
            error: error.message
        });
    }
});

module.exports = router;