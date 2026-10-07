const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const QRCode = require('qrcode');

// ─── REGISTER PATIENT WITH MANDATORY BIOMETRICS ───
router.post('/register-with-biometrics', async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            date_of_birth,
            gender,
            id_number,
            phone_number,
            alternate_phone,
            email,
            street_address,
            province,
            city,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            registered_at,
            registered_by,
            fingerprint_template,
            face_encoding,
            fingerprint_device,
            face_device
        } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !phone_number) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and phone number are required'
            });
        }

        // ✅ MANDATORY: Validate biometrics
        if (!fingerprint_template) {
            return res.status(400).json({
                success: false,
                message: 'Fingerprint registration is mandatory. Please scan fingerprint.'
            });
        }

        if (!face_encoding) {
            return res.status(400).json({
                success: false,
                message: 'Face recognition registration is mandatory. Please capture face.'
            });
        }

        // Check for duplicate fingerprint
        const [existingFingerprint] = await db.query(
            'SELECT patient_id FROM patients WHERE fingerprint_template = ?',
            [fingerprint_template]
        );

        if (existingFingerprint.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This fingerprint is already registered to another patient. Please verify identity.'
            });
        }

        // Check for duplicate face encoding
        const [existingFace] = await db.query(
            'SELECT patient_id FROM patients WHERE face_encoding = ?',
            [face_encoding]
        );

        if (existingFace.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This face is already registered to another patient. Please verify identity.'
            });
        }

        // Check for duplicate ID number
        if (id_number) {
            const [existing] = await db.query(
                'SELECT patient_id FROM patients WHERE id_number = ?',
                [id_number]
            );
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Patient with this ID number already exists'
                });
            }
        }

        // Generate patient code and smart card ID
        const patient_code = `P${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        const smart_card_id = `SC${Date.now().toString().slice(-8)}`;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert patient with biometrics
            const [result] = await connection.query(`
                INSERT INTO patients (
                    patient_code,
                    first_name,
                    last_name,
                    date_of_birth,
                    gender,
                    id_number,
                    phone_number,
                    alternate_phone,
                    email,
                    street_address,
                    province,
                    city,
                    smart_card_id,
                    smart_card_issued,
                    phone_verified,
                    status,
                    registration_date,
                    registered_at,
                    registered_by,
                    fingerprint_template,
                    face_encoding,
                    fingerprint_registered,
                    face_registered,
                    biometric_registered_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, NOW())
            `, [
                patient_code,
                first_name,
                last_name,
                date_of_birth || null,
                gender || null,
                id_number || null,
                phone_number,
                alternate_phone || null,
                email || null,
                street_address || null,
                province || null,
                city || null,
                smart_card_id,
                1,
                0,
                'active',
                registered_at || null,
                registered_by || null,
                fingerprint_template,
                face_encoding,
                1,
                1
            ]);

            const patientId = result.insertId;

            // Log biometric registration
            await connection.query(`
                INSERT INTO biometric_audit (patient_id, biometric_type, action, device_info) 
                VALUES (?, 'fingerprint', 'register', ?)
            `, [patientId, fingerprint_device || 'Unknown']);

            await connection.query(`
                INSERT INTO biometric_audit (patient_id, biometric_type, action, device_info) 
                VALUES (?, 'face', 'register', ?)
            `, [patientId, face_device || 'Unknown']);

            // Insert next of kin if provided
            if (emergency_contact_name && emergency_contact_phone) {
                await connection.query(`
                    INSERT INTO next_of_kin (patient_id, full_name, relationship, phone)
                    VALUES (?, ?, ?, ?)
                `, [patientId, emergency_contact_name, emergency_contact_relationship || null, emergency_contact_phone]);
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Patient registered successfully with biometric verification',
                data: {
                    patient_id: patientId,
                    patient_code: patient_code,
                    smart_card_id: smart_card_id,
                    biometrics: {
                        fingerprint_registered: true,
                        face_registered: true,
                        registered_at: new Date().toISOString()
                    }
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error registering patient with biometrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register patient',
            error: error.message
        });
    }
});

// ─── BIOMETRIC CHECK-IN (FINGERPRINT OR FACE) ───
router.post('/biometric-checkin', async (req, res) => {
    try {
        const { biometric_data, biometric_type, facilityId } = req.body;

        if (!biometric_data) {
            return res.status(400).json({
                success: false,
                message: 'Biometric data is required'
            });
        }

        if (!biometric_type || !['fingerprint', 'face'].includes(biometric_type)) {
            return res.status(400).json({
                success: false,
                message: 'Valid biometric type (fingerprint or face) is required'
            });
        }

        let patient = null;
        let checkinMethod = biometric_type;

        // Search by fingerprint or face
        if (biometric_type === 'fingerprint') {
            const [patients] = await db.query(
                'SELECT * FROM patients WHERE fingerprint_template = ? AND status = "active"',
                [biometric_data]
            );
            if (patients.length > 0) patient = patients[0];
        } else if (biometric_type === 'face') {
            const [patients] = await db.query(
                'SELECT * FROM patients WHERE face_encoding = ? AND status = "active"',
                [biometric_data]
            );
            if (patients.length > 0) patient = patients[0];
        }

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: `No patient found with this ${biometric_type}. Please register or try again.`
            });
        }

        // Update visit information
        await db.query(
            'UPDATE patients SET last_visit_date = CURDATE(), visit_count = visit_count + 1 WHERE patient_id = ?',
            [patient.patient_id]
        );

        // Record check-in
        await db.query(`
            INSERT INTO patient_checkins (patient_id, facility_id, checkin_method) 
            VALUES (?, ?, ?)
        `, [patient.patient_id, facilityId || null, `${biometric_type}_checkin`]);

        // Log biometric check-in
        await db.query(`
            INSERT INTO biometric_audit (patient_id, biometric_type, action) 
            VALUES (?, ?, 'checkin')
        `, [patient.patient_id, biometric_type]);

        // Get full patient history
        const [visits] = await db.query(`
            SELECT 
                v.visit_id,
                v.visit_date,
                v.visit_type,
                v.status,
                d.diagnosis,
                d.icd10_code,
                p.medication,
                p.dosage,
                p.status as prescription_status
            FROM patient_visits v
            LEFT JOIN diagnoses d ON v.visit_id = d.visit_id
            LEFT JOIN prescriptions p ON v.visit_id = p.visit_id
            WHERE v.patient_id = ?
            ORDER BY v.created_at DESC
            LIMIT 10
        `, [patient.patient_id]);

        const [vitals] = await db.query(`
            SELECT 
                temperature,
                heart_rate,
                blood_pressure_systolic,
                blood_pressure_diastolic,
                oxygen_saturation,
                weight,
                recorded_at
            FROM vitals
            WHERE patient_id = ?
            ORDER BY recorded_at DESC
            LIMIT 5
        `, [patient.patient_id]);

        res.json({
            success: true,
            message: `${biometric_type.charAt(0).toUpperCase() + biometric_type.slice(1)} check-in successful`,
            data: {
                patient: {
                    id: patient.patient_id,
                    code: patient.patient_code,
                    name: `${patient.first_name} ${patient.last_name}`,
                    phone: patient.phone_number,
                    email: patient.email,
                    dateOfBirth: patient.date_of_birth,
                    gender: patient.gender,
                    smartCardId: patient.smart_card_id,
                    visitCount: patient.visit_count || 0,
                    lastVisit: patient.last_visit_date,
                    fingerprint_registered: patient.fingerprint_registered === 1,
                    face_registered: patient.face_registered === 1
                },
                history: {
                    visits: visits || [],
                    vitals: vitals || []
                },
                checkin: {
                    method: checkinMethod,
                    time: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Error during biometric check-in:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check in patient',
            error: error.message
        });
    }
});

// ─── VERIFY PATIENT EXISTS (for duplicate prevention) ───
router.post('/verify-biometrics', async (req, res) => {
    try {
        const { fingerprint_template, face_encoding } = req.body;

        let results = {
            fingerprint_exists: false,
            face_exists: false,
            patient_id: null,
            patient_name: null
        };

        if (fingerprint_template) {
            const [existing] = await db.query(
                'SELECT patient_id, first_name, last_name FROM patients WHERE fingerprint_template = ?',
                [fingerprint_template]
            );
            if (existing.length > 0) {
                results.fingerprint_exists = true;
                results.patient_id = existing[0].patient_id;
                results.patient_name = `${existing[0].first_name} ${existing[0].last_name}`;
            }
        }

        if (face_encoding) {
            const [existing] = await db.query(
                'SELECT patient_id, first_name, last_name FROM patients WHERE face_encoding = ?',
                [face_encoding]
            );
            if (existing.length > 0) {
                results.face_exists = true;
                results.patient_id = existing[0].patient_id;
                results.patient_name = `${existing[0].first_name} ${existing[0].last_name}`;
            }
        }

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Error verifying biometrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify biometrics',
            error: error.message
        });
    }
});

// ─── GET PATIENT BY SMART CARD ───
router.get('/smart-card/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        
        const [patients] = await db.query(`
            SELECT 
                p.*,
                f.facility_name as registered_facility,
                p.fingerprint_registered,
                p.face_registered
            FROM patients p
            LEFT JOIN facilities f ON p.registered_at = f.facility_id
            WHERE p.smart_card_id = ? AND p.status = 'active'
        `, [cardId]);
        
        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }
        
        res.json({
            success: true,
            data: patients[0]
        });
        
    } catch (error) {
        console.error('Error fetching patient by smart card:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient',
            error: error.message
        });
    }
});

module.exports = router;