// backend/src/routes/patients.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─── CALCULATE AGE ───
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// ─── SCHEDULE PHONE CALL REMINDER ───
const schedulePhoneCallReminder = async (patientId, firstName, lastName, phoneNumber, age, language = 'English') => {
    try {
        const existingLogs = await db.query(
            'SELECT * FROM phone_call_reminder_logs WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1',
            [patientId]
        );

        if (existingLogs.length > 0) {
            console.log(`📞 Patient ${firstName} ${lastName} already has phone call reminders`);
            return;
        }

        await db.execute(`
            INSERT INTO phone_call_reminder_logs (
                patient_id, patient_name, phone_number, 
                call_status, call_attempts, call_notes,
                preferred_language
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            patientId,
            `${firstName} ${lastName}`,
            phoneNumber,
            'scheduled',
            0,
            `Auto-enrolled for phone call reminders (Age: ${age}, Language: ${language})`,
            language
        ]);

        console.log(`📞 Phone call reminder scheduled for patient: ${firstName} ${lastName} (Age: ${age}, Language: ${language})`);

    } catch (error) {
        console.error('❌ Error scheduling phone call reminder:', error);
    }
};

// ─── GET ALL PATIENTS ───
router.get('/', async (req, res) => {
    try {
        const patients = await db.query(`
            SELECT p.*, 
                   u.full_name as registered_by_name,
                   DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as formatted_date
            FROM patients p
            LEFT JOIN users u ON p.registered_by = u.user_id
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, patients });
    } catch (error) {
        console.error('❌ Get patients error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── GET PATIENT BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const patients = await db.query(`
            SELECT p.*, 
                   u.full_name as registered_by_name
            FROM patients p
            LEFT JOIN users u ON p.registered_by = u.user_id
            WHERE p.patient_id = ?
        `, [req.params.id]);

        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        res.json({ success: true, patient: patients[0] });
    } catch (error) {
        console.error('❌ Get patient error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── CREATE PATIENT ───
router.post('/', async (req, res) => {
    try {
        console.log('📥 Full request body:', JSON.stringify(req.body, null, 2));

        const {
            first_name, last_name, date_of_birth, gender, id_number,
            phone_number, alternate_phone, email, street_address, city,
            province, emergency_contact_name, emergency_contact_phone,
            emergency_contact_relationship, allergies, chronic_conditions,
            current_medications, medical_aid_name, medical_aid_number,
            medical_aid_plan, blood_group, registered_by, otp_verified,
            face_registered, preferred_language
        } = req.body;

        const finalPhone = phone_number || null;
        const language = preferred_language || 'English';

        // ─── VALIDATION ───
        if (!first_name || !last_name) {
            return res.status(400).json({ 
                success: false, 
                message: 'First name and last name are required' 
            });
        }

        if (!finalPhone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number is required' 
            });
        }

        if (!otp_verified) {
            return res.status(403).json({ 
                success: false, 
                message: 'OTP verification required before registration' 
            });
        }

        // ─── CALCULATE AGE ───
        let age = null;
        let phoneCallReminder = 0;
        let reminderContactNumber = finalPhone;

        if (date_of_birth) {
            age = calculateAge(date_of_birth);
            
            if (age !== null && age >= 50) {
                phoneCallReminder = 1;
                console.log(`✅ Patient ${first_name} ${last_name} (Age: ${age}) auto-enrolled for phone call reminders in ${language}`);
            }
        }

        console.log('📝 Creating patient:', { 
            first_name, 
            last_name, 
            phone_number: finalPhone,
            age: age,
            phoneCallReminder: phoneCallReminder,
            preferred_language: language,
            otp_verified: true,
            face_registered: face_registered || false
        });

        // ─── GENERATE PATIENT CODE ───
        const patientCode = `P${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;

        // ─── INSERT PATIENT ───
        const [result] = await db.execute(`
            INSERT INTO patients (
                patient_code, first_name, last_name, phone_number, email,
                date_of_birth, gender, id_number, alternate_phone, street_address,
                city, province, emergency_contact_name,
                emergency_contact_phone, emergency_contact_relationship,
                allergies, chronic_conditions, current_medications,
                medical_aid_name, medical_aid_number, medical_aid_plan,
                blood_group, registered_by, otp_verified, face_registered,
                age, phone_call_reminder, phone_call_reminder_consent,
                reminder_contact_number, preferred_language, status, registration_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patientCode, 
            first_name, 
            last_name, 
            finalPhone, 
            email || null,
            date_of_birth || null, 
            gender || null, 
            id_number || null,
            alternate_phone || null, 
            street_address || null, 
            city || null,
            province || null, 
            emergency_contact_name || null,
            emergency_contact_phone || null, 
            emergency_contact_relationship || null,
            allergies || null, 
            chronic_conditions || null, 
            current_medications || null,
            medical_aid_name || null, 
            medical_aid_number || null, 
            medical_aid_plan || null,
            blood_group || null, 
            registered_by || 1, 
            otp_verified || 0, 
            face_registered || 0,
            age || null,
            phoneCallReminder || 0,
            phoneCallReminder || 0,
            reminderContactNumber || null,
            language,
            'active'
        ]);

        console.log('✅ Patient created with ID:', result.insertId);

        // ─── GET CREATED PATIENT ───
        const newPatient = await db.query('SELECT * FROM patients WHERE patient_id = ?', [result.insertId]);

        // ─── IF PATIENT 50+, SCHEDULE REMINDER ───
        if (phoneCallReminder === 1 && newPatient.length > 0) {
            await schedulePhoneCallReminder(
                result.insertId, 
                first_name, 
                last_name, 
                finalPhone,
                age,
                language
            );
        }

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            patient: newPatient[0],
            patientId: result.insertId,
            autoEnrolledReminders: phoneCallReminder === 1,
            age: age,
            preferredLanguage: language
        });

    } catch (error) {
        console.error('❌ Create patient error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create patient', 
            error: error.message 
        });
    }
});

// ─── UPDATE PATIENT ───
router.put('/:id', async (req, res) => {
    try {
        const patientId = req.params.id;
        const updates = req.body;

        const existing = await db.query('SELECT patient_id FROM patients WHERE patient_id = ?', [patientId]);
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Patient not found' 
            });
        }

        const columns = await db.query('SHOW COLUMNS FROM patients');
        const columnNames = columns.map(col => col.Field);

        const fields = [];
        const values = [];

        const fieldMapping = {
            'first_name': 'first_name',
            'last_name': 'last_name',
            'date_of_birth': 'date_of_birth',
            'gender': 'gender',
            'id_number': 'id_number',
            'phone': 'phone_number',
            'phone_number': 'phone_number',
            'alternate_phone': 'alternate_phone',
            'email': 'email',
            'street_address': 'street_address',
            'city': 'city',
            'province': 'province',
            'emergency_contact_name': 'emergency_contact_name',
            'emergency_contact_phone': 'emergency_contact_phone',
            'emergency_contact_relationship': 'emergency_contact_relationship',
            'allergies': 'allergies',
            'chronic_conditions': 'chronic_conditions',
            'current_medications': 'current_medications',
            'medical_aid_name': 'medical_aid_name',
            'medical_aid_number': 'medical_aid_number',
            'medical_aid_plan': 'medical_aid_plan',
            'blood_group': 'blood_group',
            'status': 'status',
            'face_registered': 'face_registered',
            'otp_verified': 'otp_verified',
            'phone_call_reminder': 'phone_call_reminder',
            'phone_call_reminder_consent': 'phone_call_reminder_consent',
            'reminder_contact_number': 'reminder_contact_number',
            'preferred_language': 'preferred_language'
        };

        for (const [frontendField, dbField] of Object.entries(fieldMapping)) {
            if (updates[frontendField] !== undefined && columnNames.includes(dbField)) {
                fields.push(`${dbField} = ?`);
                values.push(updates[frontendField]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No fields to update' 
            });
        }

        fields.push('updated_at = NOW()');
        values.push(patientId);

        await db.execute(`UPDATE patients SET ${fields.join(', ')} WHERE patient_id = ?`, values);

        const updated = await db.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);

        res.json({ 
            success: true, 
            message: 'Patient updated successfully', 
            patient: updated[0] 
        });

    } catch (error) {
        console.error('❌ Update patient error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update patient', 
            error: error.message 
        });
    }
});

// ─── DELETE PATIENT ───
router.delete('/:id', async (req, res) => {
    try {
        const patientId = req.params.id;

        const existing = await db.query('SELECT patient_id FROM patients WHERE patient_id = ?', [patientId]);
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Patient not found' 
            });
        }

        await db.execute('DELETE FROM patients WHERE patient_id = ?', [patientId]);

        res.json({ 
            success: true, 
            message: 'Patient deleted successfully' 
        });

    } catch (error) {
        console.error('❌ Delete patient error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete patient', 
            error: error.message 
        });
    }
});

// ─── GET PATIENTS ELIGIBLE FOR PHONE CALL REMINDERS ───
router.get('/reminder-eligible', async (req, res) => {
    try {
        const patients = await db.query(`
            SELECT 
                patient_id, 
                CONCAT(first_name, ' ', last_name) as full_name,
                phone_number,
                age,
                phone_call_reminder,
                phone_call_reminder_consent,
                preferred_language,
                DATE_FORMAT(created_at, '%Y-%m-%d') as registration_date
            FROM patients 
            WHERE phone_call_reminder = 1 
            AND status = 'active'
            ORDER BY age DESC
        `);

        res.json({
            success: true,
            data: patients,
            count: patients.length
        });
    } catch (error) {
        console.error('❌ Get reminder eligible patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patients',
            error: error.message
        });
    }
});

// ─── GET PATIENT BY QR CODE ───
router.get('/qr/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;

        const patients = await db.query(
            `SELECT p.*, CONCAT(p.first_name, ' ', p.last_name) as full_name,
                    p.preferred_language
             FROM patients p
             WHERE p.patient_code = ? OR p.smart_card_id = ? OR p.qr_code LIKE ?`,
            [qrCode, qrCode, `%${qrCode}%`]
        );

        if (patients.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Patient not found' 
            });
        }

        res.json({ 
            success: true, 
            patient: patients[0] 
        });

    } catch (error) {
        console.error('❌ Get patient by QR error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to find patient', 
            error: error.message 
        });
    }
});

// ─── SEARCH PATIENTS ───
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const searchTerm = `%${query}%`;

        const patients = await db.query(
            `SELECT * FROM patients 
             WHERE first_name LIKE ? 
             OR last_name LIKE ? 
             OR patient_code LIKE ? 
             OR phone_number LIKE ?
             OR email LIKE ?
             OR id_number LIKE ?
             ORDER BY created_at DESC`,
            [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
        );

        res.json({ 
            success: true, 
            patients 
        });

    } catch (error) {
        console.error('❌ Search patients error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search patients', 
            error: error.message 
        });
    }
});

// ─── GET PATIENT STATISTICS ───
router.get('/stats/summary', async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as total FROM patients');
        const [today] = await db.query('SELECT COUNT(*) as today FROM patients WHERE DATE(created_at) = CURDATE()');
        const [active] = await db.query('SELECT COUNT(*) as active FROM patients WHERE status = "active"');
        const [over50] = await db.query('SELECT COUNT(*) as over50 FROM patients WHERE age >= 50 AND status = "active"');
        const [reminderEnrolled] = await db.query('SELECT COUNT(*) as reminder FROM patients WHERE phone_call_reminder = 1 AND status = "active"');
        
        let byGender = [];
        let byProvince = [];
        let byAgeGroup = [];
        let byLanguage = [];
        
        try {
            byGender = await db.query('SELECT gender, COUNT(*) as count FROM patients WHERE gender IS NOT NULL GROUP BY gender');
        } catch (err) {
            console.log('ℹ️ gender column not found');
        }
        
        try {
            byProvince = await db.query('SELECT province, COUNT(*) as count FROM patients WHERE province IS NOT NULL GROUP BY province');
        } catch (err) {
            console.log('ℹ️ province column not found');
        }

        try {
            byAgeGroup = await db.query(`
                SELECT 
                    CASE 
                        WHEN age < 18 THEN 'Under 18'
                        WHEN age BETWEEN 18 AND 30 THEN '18-30'
                        WHEN age BETWEEN 31 AND 50 THEN '31-50'
                        WHEN age > 50 THEN '50+'
                        ELSE 'Unknown'
                    END as age_group,
                    COUNT(*) as count
                FROM patients 
                WHERE age IS NOT NULL
                GROUP BY age_group
            `);
        } catch (err) {
            console.log('ℹ️ age column not found');
        }

        try {
            byLanguage = await db.query(`
                SELECT preferred_language, COUNT(*) as count 
                FROM patients 
                WHERE preferred_language IS NOT NULL 
                GROUP BY preferred_language
            `);
        } catch (err) {
            console.log('ℹ️ preferred_language column not found');
        }

        res.json({
            success: true,
            stats: {
                total: total[0]?.total || 0,
                today: today[0]?.today || 0,
                active: active[0]?.active || 0,
                over50: over50[0]?.over50 || 0,
                reminderEnrolled: reminderEnrolled[0]?.reminder || 0,
                byGender: byGender || [],
                byProvince: byProvince || [],
                byAgeGroup: byAgeGroup || [],
                byLanguage: byLanguage || []
            }
        });

    } catch (error) {
        console.error('❌ Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics',
            error: error.message
        });
    }
});

module.exports = router;