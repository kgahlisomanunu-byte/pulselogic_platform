const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─── GET ALL MATERNITY RECORDS ───
router.get('/', async (req, res) => {
    try {
        const records = await db.query(`
            SELECT m.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   p.patient_code,
                   p.date_of_birth,
                   p.gender,
                   p.phone,
                   p.email,
                   f.facility_name,
                   (SELECT COUNT(*) FROM maternity_visits mv WHERE mv.patient_id = m.patient_id) as total_visits,
                   (SELECT COUNT(*) FROM maternity_visits mv WHERE mv.patient_id = m.patient_id AND mv.status = 'missed') as missed_visits,
                   (SELECT COUNT(*) FROM maternity_visits mv WHERE mv.patient_id = m.patient_id AND mv.status = 'scheduled') as scheduled_visits
            FROM maternity_records m
            LEFT JOIN patients p ON m.patient_id = p.patient_id
            LEFT JOIN facilities f ON m.facility_id = f.facility_id
            ORDER BY m.created_at DESC
        `);

        res.json({
            success: true,
            data: records,
            count: records.length
        });
    } catch (error) {
        console.error('❌ Get maternity records error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maternity records',
            error: error.message
        });
    }
});

// ─── GET MATERNITY RECORD BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const records = await db.query(`
            SELECT m.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   p.patient_code,
                   p.date_of_birth,
                   p.gender,
                   p.phone,
                   p.email,
                   p.address,
                   f.facility_name
            FROM maternity_records m
            LEFT JOIN patients p ON m.patient_id = p.patient_id
            LEFT JOIN facilities f ON m.facility_id = f.facility_id
            WHERE m.record_id = ?
        `, [req.params.id]);

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Maternity record not found'
            });
        }

        const patientId = records[0].patient_id;

        // Get vitals
        const vitals = await db.query(`
            SELECT * FROM maternity_vitals 
            WHERE patient_id = ? 
            ORDER BY recorded_at DESC
        `, [patientId]);

        // Get investigations / lab tests
        const investigations = await db.query(`
            SELECT * FROM maternity_investigations 
            WHERE patient_id = ? 
            ORDER BY created_at DESC
        `, [patientId]);

        // Get diagnoses
        const diagnoses = await db.query(`
            SELECT * FROM diagnoses 
            WHERE patient_id = ? 
            ORDER BY diagnosis_date DESC
        `, [patientId]);

        // Get birth plan
        const birthPlan = await db.query(`
            SELECT * FROM maternity_birth_plans 
            WHERE patient_id = ? 
            ORDER BY created_at DESC
        `, [patientId]);

        // Get delivery records
        const deliveries = await db.query(`
            SELECT * FROM maternity_deliveries 
            WHERE patient_id = ? 
            ORDER BY delivery_date DESC
        `, [patientId]);

        // Get postnatal records
        const postnatal = await db.query(`
            SELECT * FROM maternity_postnatal 
            WHERE patient_id = ? 
            ORDER BY follow_up_date DESC
        `, [patientId]);

        // Get visit history
        const visits = await db.query(`
            SELECT * FROM maternity_visits 
            WHERE patient_id = ? 
            ORDER BY visit_date DESC
        `, [patientId]);

        // Get medications / supplements
        const medications = await db.query(`
            SELECT * FROM maternity_medications 
            WHERE patient_id = ? 
            ORDER BY created_at DESC
        `, [patientId]);

        // Get fetal assessments
        const fetalAssessments = await db.query(`
            SELECT * FROM maternity_fetal_assessments 
            WHERE patient_id = ? 
            ORDER BY assessment_date DESC
        `, [patientId]);

        // Get lab tests
        const labTests = await db.query(`
            SELECT * FROM maternity_lab_tests 
            WHERE patient_id = ? 
            ORDER BY test_date DESC
        `, [patientId]);

        // Get reminders
        const reminders = await db.query(`
            SELECT * FROM maternity_reminders 
            WHERE patient_id = ? 
            ORDER BY reminder_date ASC
        `, [patientId]);

        // Get referrals
        const referrals = await db.query(`
            SELECT * FROM maternity_referrals 
            WHERE patient_id = ? 
            ORDER BY referral_date DESC
        `, [patientId]);

        // Get visit statistics
        const visitStats = await db.query(`
            SELECT 
                COUNT(*) as total_visits,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
                SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_visits,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_visits
            FROM maternity_visits 
            WHERE patient_id = ?
        `, [patientId]);

        // Get outcome summary
        const outcomeSummary = await db.query(`
            SELECT 
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN maternal_outcome = 'alive' THEN 1 ELSE 0 END) as mothers_alive,
                SUM(CASE WHEN maternal_outcome = 'deceased' THEN 1 ELSE 0 END) as mothers_deceased,
                SUM(CASE WHEN newborn_outcome = 'alive' THEN 1 ELSE 0 END) as babies_alive,
                SUM(CASE WHEN newborn_outcome = 'stillborn' THEN 1 ELSE 0 END) as stillborn_babies,
                SUM(CASE WHEN newborn_outcome = 'deceased' THEN 1 ELSE 0 END) as babies_deceased,
                SUM(CASE WHEN maternal_outcome = 'deceased' AND newborn_outcome = 'alive' THEN 1 ELSE 0 END) as mother_deceased_baby_alive,
                SUM(CASE WHEN maternal_outcome = 'alive' AND newborn_outcome = 'deceased' THEN 1 ELSE 0 END) as mother_alive_baby_deceased,
                SUM(CASE WHEN maternal_outcome = 'deceased' AND newborn_outcome = 'deceased' THEN 1 ELSE 0 END) as both_deceased,
                SUM(CASE WHEN maternal_outcome = 'alive' AND newborn_outcome = 'alive' THEN 1 ELSE 0 END) as both_alive
            FROM maternity_deliveries 
            WHERE patient_id = ?
        `, [patientId]);

        // Get next appointment
        const nextAppointment = await db.query(`
            SELECT * FROM maternity_visits 
            WHERE patient_id = ? AND status = 'scheduled' AND visit_date >= CURDATE()
            ORDER BY visit_date ASC
            LIMIT 1
        `, [patientId]);

        res.json({
            success: true,
            data: {
                ...records[0],
                vitals: vitals || [],
                investigations: investigations || [],
                diagnoses: diagnoses || [],
                birth_plan: birthPlan[0] || null,
                deliveries: deliveries || [],
                postnatal: postnatal || [],
                visits: visits || [],
                medications: medications || [],
                fetal_assessments: fetalAssessments || [],
                lab_tests: labTests || [],
                reminders: reminders || [],
                referrals: referrals || [],
                visit_stats: visitStats[0] || { total_visits: 0, completed_visits: 0, missed_visits: 0, scheduled_visits: 0 },
                outcome_summary: outcomeSummary[0] || { 
                    total_deliveries: 0, 
                    mothers_alive: 0, 
                    mothers_deceased: 0,
                    babies_alive: 0,
                    stillborn_babies: 0,
                    babies_deceased: 0,
                    mother_deceased_baby_alive: 0,
                    mother_alive_baby_deceased: 0,
                    both_deceased: 0,
                    both_alive: 0
                },
                next_appointment: nextAppointment[0] || null
            }
        });
    } catch (error) {
        console.error('❌ Get maternity record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maternity record',
            error: error.message
        });
    }
});

// ─── CREATE MATERNITY RECORD ───
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            facility_id = 1,
            lmp,
            edd,
            gestational_weeks,
            gravida,
            para,
            previous_pregnancies,
            previous_complications,
            risk_level = 'low',
            status = 'active',
            first_visit_date,
            referred_from,
            height,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            pulse_rate,
            oxygen_saturation,
            weight,
            blood_glucose
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const patientCheck = await db.query(
            'SELECT patient_id FROM patients WHERE patient_id = ?',
            [patient_id]
        );

        if (!patientCheck || patientCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const existingRecord = await db.query(
            `SELECT record_id FROM maternity_records 
             WHERE patient_id = ? AND status IN ('active', 'referred')`,
            [patient_id]
        );

        if (existingRecord.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Patient already has an active maternity record'
            });
        }

        let finalEdd = edd;
        if (lmp && !edd) {
            const lmpDate = new Date(lmp);
            finalEdd = new Date(lmpDate.setDate(lmpDate.getDate() + 280)).toISOString().split('T')[0];
        }

        let finalGestationalWeeks = gestational_weeks;
        if (lmp && !gestational_weeks) {
            const lmpDate = new Date(lmp);
            const today = new Date();
            const diffTime = Math.abs(today - lmpDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            finalGestationalWeeks = Math.floor(diffDays / 7);
        }

        const insertResult = await db.execute(`
            INSERT INTO maternity_records (
                patient_id, facility_id, lmp, edd, gestational_weeks,
                gravida, para, previous_pregnancies, previous_complications,
                risk_level, status, first_visit_date, referred_from,
                height, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, oxygen_saturation, weight, blood_glucose,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            facility_id,
            lmp || null,
            finalEdd || null,
            finalGestationalWeeks || null,
            gravida || 0,
            para || 0,
            previous_pregnancies || null,
            previous_complications || null,
            risk_level,
            status,
            first_visit_date || new Date().toISOString().split('T')[0],
            referred_from || null,
            height || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            pulse_rate || null,
            oxygen_saturation || null,
            weight || null,
            blood_glucose || null
        ]);

        const recordId = insertResult.insertId;

        // Create initial visit record
        await db.execute(`
            INSERT INTO maternity_visits (
                patient_id, facility_id, visit_date, visit_type,
                gestational_weeks, status, notes, created_at,
                weight, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, oxygen_saturation, blood_glucose
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
        `, [
            patient_id,
            facility_id,
            first_visit_date || new Date().toISOString().split('T')[0],
            'initial',
            finalGestationalWeeks || 0,
            'completed',
            'Initial registration visit',
            weight || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            pulse_rate || null,
            oxygen_saturation || null,
            blood_glucose || null
        ]);

        // Create initial vitals record
        await db.execute(`
            INSERT INTO maternity_vitals (
                patient_id, weight, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, oxygen_saturation, blood_glucose, height,
                recorded_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            weight || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            pulse_rate || null,
            oxygen_saturation || null,
            blood_glucose || null,
            height || null
        ]);

        const newRecord = await db.query(`
            SELECT m.*, 
                   CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                   f.facility_name
            FROM maternity_records m
            LEFT JOIN patients p ON m.patient_id = p.patient_id
            LEFT JOIN facilities f ON m.facility_id = f.facility_id
            WHERE m.record_id = ?
        `, [recordId]);

        res.status(201).json({
            success: true,
            message: 'Maternity record created successfully',
            data: newRecord[0] || null
        });

    } catch (error) {
        console.error('❌ Create maternity record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create maternity record',
            error: error.message
        });
    }
});

// ─── RECORD VITALS ───
router.post('/vitals', async (req, res) => {
    try {
        const {
            patient_id,
            weight,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            pulse_rate,
            oxygen_saturation,
            temperature,
            fundal_height,
            fetal_heart_rate,
            fetal_movement,
            urine_protein,
            blood_glucose,
            swelling,
            blurred_vision,
            headache,
            vaginal_bleeding,
            abdominal_pain,
            fluid_leakage,
            contractions,
            symptoms,
            height,
            dizziness,
            shortness_of_breath,
            recorded_by = 1
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        // Record vitals
        const vitalsResult = await db.execute(`
            INSERT INTO maternity_vitals (
                patient_id, weight, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, oxygen_saturation, temperature, height,
                fundal_height, fetal_heart_rate, fetal_movement, urine_protein,
                blood_glucose, swelling, blurred_vision, headache,
                vaginal_bleeding, abdominal_pain, fluid_leakage, contractions,
                symptoms, recorded_by, recorded_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id, weight || null, blood_pressure_systolic || null,
            blood_pressure_diastolic || null, pulse_rate || null,
            oxygen_saturation || null, temperature || null, height || null,
            fundal_height || null, fetal_heart_rate || null,
            fetal_movement || 'Normal', urine_protein || 'Negative',
            blood_glucose || null, swelling || 'None',
            blurred_vision ? 1 : 0, headache ? 1 : 0,
            vaginal_bleeding ? 1 : 0, abdominal_pain ? 1 : 0,
            fluid_leakage ? 1 : 0, contractions ? 1 : 0,
            symptoms || null, recorded_by
        ]);

        const vitalsId = vitalsResult.insertId;

        // Auto-diagnose
        const diagnoses = await autoDiagnose(req.body);

        // Update maternity record with latest vitals
        await db.execute(`
            UPDATE maternity_records 
            SET weight = COALESCE(?, weight),
                blood_pressure_systolic = COALESCE(?, blood_pressure_systolic),
                blood_pressure_diastolic = COALESCE(?, blood_pressure_diastolic),
                pulse_rate = COALESCE(?, pulse_rate),
                oxygen_saturation = COALESCE(?, oxygen_saturation),
                blood_glucose = COALESCE(?, blood_glucose),
                height = COALESCE(?, height),
                updated_at = NOW()
            WHERE patient_id = ? AND status = 'active'
        `, [
            weight || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            pulse_rate || null,
            oxygen_saturation || null,
            blood_glucose || null,
            height || null,
            patient_id
        ]);

        // Update risk level if hypertension detected
        if (blood_pressure_systolic >= 140 || blood_pressure_diastolic >= 90) {
            await db.execute(`
                UPDATE maternity_records 
                SET risk_level = CASE 
                    WHEN ? >= 160 OR ? >= 110 THEN 'critical'
                    WHEN ? >= 140 OR ? >= 90 THEN 'high'
                    ELSE risk_level
                END,
                updated_at = NOW()
                WHERE patient_id = ? AND status = 'active'
            `, [
                blood_pressure_systolic, blood_pressure_diastolic,
                blood_pressure_systolic, blood_pressure_diastolic,
                patient_id
            ]);
        }

        // Create visit record for this vitals check
        const currentWeeks = await db.query(
            'SELECT gestational_weeks FROM maternity_records WHERE patient_id = ? AND status = "active"',
            [patient_id]
        );

        await db.execute(`
            INSERT INTO maternity_visits (
                patient_id, visit_date, visit_type,
                gestational_weeks, status, notes,
                weight, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, oxygen_saturation, blood_glucose,
                fetal_heart_rate, fundal_height, symptoms,
                temperature, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            patient_id,
            new Date().toISOString().split('T')[0],
            'vitals_check',
            currentWeeks[0]?.gestational_weeks || null,
            'completed',
            'Vitals recorded',
            weight || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            pulse_rate || null,
            oxygen_saturation || null,
            blood_glucose || null,
            fetal_heart_rate || null,
            fundal_height || null,
            symptoms || null,
            temperature || null
        ]);

        const recordedVitals = await db.query(
            'SELECT * FROM maternity_vitals WHERE vitals_id = ?',
            [vitalsId]
        );

        res.status(201).json({
            success: true,
            message: 'Vitals recorded successfully',
            data: recordedVitals[0] || null,
            diagnoses: diagnoses
        });

    } catch (error) {
        console.error('❌ Record vitals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record vitals',
            error: error.message
        });
    }
});

// ─── RECORD MEDICATION ───
router.post('/medications', async (req, res) => {
    try {
        const {
            patient_id,
            medication_name,
            dosage,
            frequency,
            start_date,
            end_date,
            prescribed_by,
            notes,
            supplement_name,
            supplement_dosage,
            supplement_frequency
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const medicationResult = await db.execute(`
            INSERT INTO maternity_medications (
                patient_id, medication_name, dosage, frequency,
                start_date, end_date, prescribed_by, notes,
                supplement_name, supplement_dosage, supplement_frequency,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            medication_name || null,
            dosage || null,
            frequency || null,
            start_date || new Date().toISOString().split('T')[0],
            end_date || null,
            prescribed_by || null,
            notes || null,
            supplement_name || null,
            supplement_dosage || null,
            supplement_frequency || null
        ]);

        const medicationId = medicationResult.insertId;

        const medication = await db.query(
            'SELECT * FROM maternity_medications WHERE medication_id = ?',
            [medicationId]
        );

        res.status(201).json({
            success: true,
            message: 'Medication recorded successfully',
            data: medication[0] || null
        });

    } catch (error) {
        console.error('❌ Record medication error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record medication',
            error: error.message
        });
    }
});

// ─── RECORD FETAL ASSESSMENT ───
router.post('/fetal-assessment', async (req, res) => {
    try {
        const {
            patient_id,
            assessment_date,
            gestational_weeks,
            fetal_heart_rate,
            fetal_movement,
            fundal_height,
            presentation,
            amniotic_fluid,
            placenta_position,
            doppler_study,
            biophysical_profile,
            notes,
            assessed_by
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const fetalResult = await db.execute(`
            INSERT INTO maternity_fetal_assessments (
                patient_id, assessment_date, gestational_weeks,
                fetal_heart_rate, fetal_movement, fundal_height,
                presentation, amniotic_fluid, placenta_position,
                doppler_study, biophysical_profile, notes,
                assessed_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            assessment_date || new Date().toISOString().split('T')[0],
            gestational_weeks || null,
            fetal_heart_rate || null,
            fetal_movement || 'Normal',
            fundal_height || null,
            presentation || null,
            amniotic_fluid || null,
            placenta_position || null,
            doppler_study || null,
            biophysical_profile || null,
            notes || null,
            assessed_by || null
        ]);

        const assessmentId = fetalResult.insertId;

        // Update fetal heart rate in vitals
        if (fetal_heart_rate) {
            await db.execute(`
                INSERT INTO maternity_vitals (
                    patient_id, fetal_heart_rate, fetal_movement,
                    fundal_height, recorded_at, created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                patient_id,
                fetal_heart_rate,
                fetal_movement || 'Normal',
                fundal_height || null,
                assessment_date || new Date()
            ]);
        }

        const assessment = await db.query(
            'SELECT * FROM maternity_fetal_assessments WHERE assessment_id = ?',
            [assessmentId]
        );

        res.status(201).json({
            success: true,
            message: 'Fetal assessment recorded successfully',
            data: assessment[0] || null
        });

    } catch (error) {
        console.error('❌ Record fetal assessment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record fetal assessment',
            error: error.message
        });
    }
});

// ─── RECORD LAB TEST ───
router.post('/lab-tests', async (req, res) => {
    try {
        const {
            patient_id,
            test_name,
            test_date,
            result,
            normal_range,
            interpretation,
            notes,
            ordered_by
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const labResult = await db.execute(`
            INSERT INTO maternity_lab_tests (
                patient_id, test_name, test_date,
                result, normal_range, interpretation,
                notes, ordered_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            patient_id,
            test_name || null,
            test_date || new Date().toISOString().split('T')[0],
            result || null,
            normal_range || null,
            interpretation || null,
            notes || null,
            ordered_by || null
        ]);

        const testId = labResult.insertId;

        // Also add to investigations if it's a common test
        if (['haemoglobin', 'blood_glucose', 'urinalysis', 'hiv', 'syphilis'].includes(test_name?.toLowerCase())) {
            await db.execute(`
                INSERT INTO maternity_investigations (
                    patient_id, ${test_name.toLowerCase()}, created_at
                ) VALUES (?, ?, NOW())
            `, [
                patient_id,
                result || null
            ]);
        }

        const labTest = await db.query(
            'SELECT * FROM maternity_lab_tests WHERE test_id = ?',
            [testId]
        );

        res.status(201).json({
            success: true,
            message: 'Lab test recorded successfully',
            data: labTest[0] || null
        });

    } catch (error) {
        console.error('❌ Record lab test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record lab test',
            error: error.message
        });
    }
});

// ─── CREATE REFERRAL ───
router.post('/referral', async (req, res) => {
    try {
        const {
            patient_id,
            referred_to_facility,
            reason_for_referral,
            urgency,
            referral_date,
            notes,
            referred_by
        } = req.body;

        if (!patient_id || !referred_to_facility) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and referral facility are required'
            });
        }

        const referralResult = await db.execute(`
            INSERT INTO maternity_referrals (
                patient_id, referred_to_facility, reason_for_referral,
                urgency, referral_date, notes, referred_by,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            referred_to_facility,
            reason_for_referral || null,
            urgency || 'normal',
            referral_date || new Date().toISOString().split('T')[0],
            notes || null,
            referred_by || null,
            'pending'
        ]);

        const referralId = referralResult.insertId;

        // Update maternity record status
        await db.execute(`
            UPDATE maternity_records 
            SET status = 'referred', 
                referred_from = CONCAT(COALESCE(referred_from, ''), ' | Referred to: ', ?),
                updated_at = NOW()
            WHERE patient_id = ? AND status = 'active'
        `, [referred_to_facility, patient_id]);

        const referral = await db.query(
            'SELECT * FROM maternity_referrals WHERE referral_id = ?',
            [referralId]
        );

        res.status(201).json({
            success: true,
            message: 'Referral created successfully',
            data: referral[0] || null
        });

    } catch (error) {
        console.error('❌ Create referral error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create referral',
            error: error.message
        });
    }
});

// ─── CREATE REMINDER ───
router.post('/reminders', async (req, res) => {
    try {
        const {
            patient_id,
            reminder_type,
            reminder_date,
            reminder_time,
            message,
            send_sms,
            phone_number
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const reminderResult = await db.execute(`
            INSERT INTO maternity_reminders (
                patient_id, reminder_type, reminder_date,
                reminder_time, message, send_sms,
                phone_number, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            patient_id,
            reminder_type || 'appointment',
            reminder_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reminder_time || '08:00:00',
            message || 'Please attend your scheduled appointment',
            send_sms ? 1 : 0,
            phone_number || null,
            'scheduled'
        ]);

        const reminderId = reminderResult.insertId;

        // If send_sms is true, queue SMS
        if (send_sms && phone_number) {
            await queueSMS(phone_number, message || 'Reminder: Please attend your scheduled appointment');
        }

        const reminder = await db.query(
            'SELECT * FROM maternity_reminders WHERE reminder_id = ?',
            [reminderId]
        );

        res.status(201).json({
            success: true,
            message: 'Reminder created successfully',
            data: reminder[0] || null
        });

    } catch (error) {
        console.error('❌ Create reminder error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create reminder',
            error: error.message
        });
    }
});

// ─── RECORD VISIT ───
router.post('/visits', async (req, res) => {
    try {
        const {
            patient_id,
            facility_id = 1,
            visit_date,
            visit_time,
            visit_type,
            gestational_weeks,
            status = 'completed',
            notes,
            symptoms,
            weight,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            pulse_rate,
            oxygen_saturation,
            fetal_heart_rate,
            fundal_height,
            blood_glucose,
            temperature
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const finalVisitDate = visit_date || new Date().toISOString().split('T')[0];

        const visitResult = await db.execute(`
            INSERT INTO maternity_visits (
                patient_id, facility_id, visit_date, visit_time, visit_type,
                gestational_weeks, status, notes, symptoms,
                weight, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, oxygen_saturation, fetal_heart_rate,
                fundal_height, blood_glucose, temperature,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            facility_id,
            finalVisitDate,
            visit_time || null,
            visit_type || 'routine',
            gestational_weeks || null,
            status || 'completed',
            notes || null,
            symptoms || null,
            weight || null,
            blood_pressure_systolic || null,
            blood_pressure_diastolic || null,
            pulse_rate || null,
            oxygen_saturation || null,
            fetal_heart_rate || null,
            fundal_height || null,
            blood_glucose || null,
            temperature || null
        ]);

        const visitId = visitResult.insertId;

        // Update maternity record
        if (gestational_weeks) {
            await db.execute(`
                UPDATE maternity_records 
                SET gestational_weeks = ?, updated_at = NOW()
                WHERE patient_id = ? AND status = 'active'
            `, [gestational_weeks, patient_id]);
        }

        // If vitals were recorded, also save to vitals table
        if (weight || blood_pressure_systolic || fetal_heart_rate || pulse_rate || oxygen_saturation || temperature) {
            await db.execute(`
                INSERT INTO maternity_vitals (
                    patient_id, weight, blood_pressure_systolic, blood_pressure_diastolic,
                    pulse_rate, oxygen_saturation, fetal_heart_rate, fundal_height,
                    blood_glucose, temperature, recorded_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                patient_id,
                weight || null,
                blood_pressure_systolic || null,
                blood_pressure_diastolic || null,
                pulse_rate || null,
                oxygen_saturation || null,
                fetal_heart_rate || null,
                fundal_height || null,
                blood_glucose || null,
                temperature || null,
                finalVisitDate
            ]);
        }

        const visit = await db.query(
            'SELECT * FROM maternity_visits WHERE visit_id = ?',
            [visitId]
        );

        res.status(201).json({
            success: true,
            message: 'Visit recorded successfully',
            data: visit[0] || null
        });

    } catch (error) {
        console.error('❌ Record visit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record visit',
            error: error.message
        });
    }
});

// ─── SCHEDULE NEXT APPOINTMENT ───
router.post('/schedule-appointment', async (req, res) => {
    try {
        const {
            patient_id,
            appointment_date,
            appointment_time,
            visit_type,
            notes,
            send_reminder
        } = req.body;

        if (!patient_id || !appointment_date) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and appointment date are required'
            });
        }

        // Check for existing scheduled appointment
        const existing = await db.query(`
            SELECT * FROM maternity_visits 
            WHERE patient_id = ? AND status = 'scheduled' AND visit_date >= CURDATE()
        `, [patient_id]);

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Patient already has a scheduled appointment',
                data: existing[0]
            });
        }

        const appointmentResult = await db.execute(`
            INSERT INTO maternity_visits (
                patient_id, visit_date, visit_time, visit_type,
                status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            appointment_date,
            appointment_time || '09:00:00',
            visit_type || 'routine',
            'scheduled',
            notes || null
        ]);

        const appointmentId = appointmentResult.insertId;

        // Send reminder if requested
        if (send_reminder) {
            const patient = await db.query(
                'SELECT phone, CONCAT(first_name, " ", last_name) as name FROM patients WHERE patient_id = ?',
                [patient_id]
            );
            
            if (patient.length > 0 && patient[0].phone) {
                const reminderDate = new Date(appointment_date);
                reminderDate.setDate(reminderDate.getDate() - 2);
                
                await db.execute(`
                    INSERT INTO maternity_reminders (
                        patient_id, reminder_type, reminder_date,
                        reminder_time, message, send_sms,
                        phone_number, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    patient_id,
                    'appointment',
                    reminderDate.toISOString().split('T')[0],
                    '08:00:00',
                    `Dear ${patient[0].name}, this is a reminder that your appointment is scheduled for ${appointment_date} at ${appointment_time || '09:00'}. Please ensure you attend. - PulseLogic Health`,
                    1,
                    patient[0].phone,
                    'scheduled'
                ]);

                await queueSMS(
                    patient[0].phone,
                    `Dear ${patient[0].name}, your appointment is scheduled for ${appointment_date} at ${appointment_time || '09:00'}. Please ensure you attend. - PulseLogic Health`
                );
            }
        }

        const appointment = await db.query(
            'SELECT * FROM maternity_visits WHERE visit_id = ?',
            [appointmentId]
        );

        res.status(201).json({
            success: true,
            message: 'Appointment scheduled successfully',
            data: appointment[0] || null
        });

    } catch (error) {
        console.error('❌ Schedule appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to schedule appointment',
            error: error.message
        });
    }
});

// ─── RECORD DELIVERY ───
router.post('/delivery', async (req, res) => {
    try {
        const {
            patient_id,
            facility_id = 1,
            delivery_date,
            delivery_time,
            gestational_age,
            delivery_method,
            baby_sex,
            birth_weight,
            apgar_1,
            apgar_5,
            number_of_babies,
            maternal_outcome,
            newborn_outcome,
            delivery_complications,
            clinician_notes,
            baby_condition,
            stillborn_reason,
            maternal_death_reason,
            baby_death_reason,
            resuscitation_performed,
            maternal_complications,
            newborn_complications
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        if (!delivery_date) {
            return res.status(400).json({
                success: false,
                message: 'Delivery date is required'
            });
        }

        const deliveryResult = await db.execute(`
            INSERT INTO maternity_deliveries (
                patient_id, facility_id, delivery_date, delivery_time,
                gestational_age, delivery_method, baby_sex, birth_weight,
                apgar_1, apgar_5, number_of_babies, maternal_outcome,
                newborn_outcome, delivery_complications, clinician_notes,
                baby_condition, stillborn_reason, maternal_death_reason,
                baby_death_reason, resuscitation_performed,
                maternal_complications, newborn_complications,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            facility_id,
            delivery_date,
            delivery_time || null,
            gestational_age || null,
            delivery_method || null,
            baby_sex || null,
            birth_weight || null,
            apgar_1 || null,
            apgar_5 || null,
            number_of_babies || 1,
            maternal_outcome || 'alive',
            newborn_outcome || 'alive',
            delivery_complications || null,
            clinician_notes || null,
            baby_condition || null,
            stillborn_reason || null,
            maternal_death_reason || null,
            baby_death_reason || null,
            resuscitation_performed ? 1 : 0,
            maternal_complications || null,
            newborn_complications || null
        ]);

        const deliveryId = deliveryResult.insertId;

        // Update maternity record status
        let recordStatus = 'completed';
        if (maternal_outcome === 'deceased') {
            recordStatus = 'maternal_deceased';
        } else if (newborn_outcome === 'stillborn' || newborn_outcome === 'deceased') {
            recordStatus = 'baby_deceased';
        }

        await db.execute(`
            UPDATE maternity_records 
            SET status = ?, 
                delivery_outcome = ?,
                gestational_weeks = COALESCE(?, gestational_weeks),
                updated_at = NOW()
            WHERE patient_id = ? AND status = 'active'
        `, [
            recordStatus,
            JSON.stringify({ maternal_outcome, newborn_outcome, gestational_age }),
            gestational_age,
            patient_id
        ]);

        // Create postnatal follow-up if mother is alive
        if (maternal_outcome === 'alive') {
            const followUpDate = new Date();
            followUpDate.setDate(followUpDate.getDate() + 7);
            
            await db.execute(`
                INSERT INTO maternity_postnatal (
                    patient_id, facility_id, follow_up_date,
                    maternal_observations, created_at, updated_at
                ) VALUES (?, ?, ?, ?, NOW(), NOW())
            `, [
                patient_id,
                facility_id,
                followUpDate.toISOString().split('T')[0],
                'Initial postnatal follow-up scheduled'
            ]);

            // Send postnatal reminder
            const patient = await db.query(
                'SELECT phone, CONCAT(first_name, " ", last_name) as name FROM patients WHERE patient_id = ?',
                [patient_id]
            );
            
            if (patient.length > 0 && patient[0].phone) {
                await queueSMS(
                    patient[0].phone,
                    `Dear ${patient[0].name}, your postnatal follow-up is scheduled for ${followUpDate.toISOString().split('T')[0]}. Please ensure you attend. - PulseLogic Health`
                );
            }
        }

        const delivery = await db.query(
            'SELECT * FROM maternity_deliveries WHERE delivery_id = ?',
            [deliveryId]
        );

        res.status(201).json({
            success: true,
            message: 'Delivery recorded successfully',
            data: delivery[0] || null
        });

    } catch (error) {
        console.error('❌ Record delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record delivery',
            error: error.message
        });
    }
});

// ─── RECORD POSTNATAL ───
router.post('/postnatal', async (req, res) => {
    try {
        const {
            patient_id,
            facility_id = 1,
            follow_up_date,
            maternal_observations,
            recovery_notes,
            follow_up_visits,
            baby_weight,
            baby_feeding,
            baby_observations,
            baby_follow_up,
            maternal_condition,
            baby_condition,
            send_reminder
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const postnatalResult = await db.execute(`
            INSERT INTO maternity_postnatal (
                patient_id, facility_id, follow_up_date,
                maternal_observations, recovery_notes, follow_up_visits,
                baby_weight, baby_feeding, baby_observations, baby_follow_up,
                maternal_condition, baby_condition,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            patient_id,
            facility_id,
            follow_up_date || null,
            maternal_observations || null,
            recovery_notes || null,
            follow_up_visits || null,
            baby_weight || null,
            baby_feeding || null,
            baby_observations || null,
            baby_follow_up || null,
            maternal_condition || null,
            baby_condition || null
        ]);

        const postnatalId = postnatalResult.insertId;

        // Send reminder if requested
        if (send_reminder && follow_up_date) {
            const patient = await db.query(
                'SELECT phone, CONCAT(first_name, " ", last_name) as name FROM patients WHERE patient_id = ?',
                [patient_id]
            );
            
            if (patient.length > 0 && patient[0].phone) {
                const reminderDate = new Date(follow_up_date);
                reminderDate.setDate(reminderDate.getDate() - 2);
                
                await db.execute(`
                    INSERT INTO maternity_reminders (
                        patient_id, reminder_type, reminder_date,
                        reminder_time, message, send_sms,
                        phone_number, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    patient_id,
                    'postnatal',
                    reminderDate.toISOString().split('T')[0],
                    '08:00:00',
                    `Dear ${patient[0].name}, this is a reminder that your postnatal follow-up is scheduled for ${follow_up_date}. Please ensure you attend your appointment. - PulseLogic Health`,
                    1,
                    patient[0].phone,
                    'scheduled'
                ]);

                await queueSMS(
                    patient[0].phone,
                    `Dear ${patient[0].name}, your postnatal follow-up is scheduled for ${follow_up_date}. Please ensure you attend. - PulseLogic Health`
                );
            }
        }

        const postnatal = await db.query(
            'SELECT * FROM maternity_postnatal WHERE postnatal_id = ?',
            [postnatalId]
        );

        res.status(201).json({
            success: true,
            message: 'Postnatal record created successfully',
            data: postnatal[0] || null
        });

    } catch (error) {
        console.error('❌ Create postnatal record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create postnatal record',
            error: error.message
        });
    }
});

// ─── AUTO-DIAGNOSE FUNCTION ───
async function autoDiagnose(vitals) {
    const diagnoses = [];
    const db = require('../config/db');
    
    const {
        patient_id,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        urine_protein,
        swelling,
        blurred_vision,
        headache,
        blood_glucose,
        fetal_movement,
        fetal_heart_rate,
        vaginal_bleeding,
        fluid_leakage,
        contractions,
        pulse_rate,
        oxygen_saturation,
        temperature
    } = vitals;

    try {
        // Pre-eclampsia detection
        if (blood_pressure_systolic >= 140 || blood_pressure_diastolic >= 90) {
            if (urine_protein === 'Positive' || urine_protein === 'Trace') {
                diagnoses.push({
                    condition: 'Pre-eclampsia',
                    risk: 'High',
                    description: 'High blood pressure with protein in urine. Requires immediate clinical review.',
                    action: 'Urgent referral to obstetrician',
                    warningSigns: ['Severe headache', 'Visual disturbances', 'Upper abdominal pain']
                });
            } else if (swelling === 'Severe' || blurred_vision || headache) {
                diagnoses.push({
                    condition: 'Possible Pre-eclampsia',
                    risk: 'Medium',
                    description: 'High blood pressure with severe symptoms. Monitor closely.',
                    action: 'Clinical review within 24 hours',
                    warningSigns: ['Monitor for worsening symptoms']
                });
            } else {
                diagnoses.push({
                    condition: 'Hypertension in Pregnancy',
                    risk: 'Medium',
                    description: 'Elevated blood pressure detected. Monitor regularly.',
                    action: 'Monitor blood pressure weekly',
                    warningSigns: ['Check for proteinuria']
                });
            }
        }

        // Gestational Diabetes
        if (blood_glucose && parseFloat(blood_glucose) > 7.8) {
            diagnoses.push({
                condition: 'Gestational Diabetes',
                risk: 'Medium',
                description: 'Elevated blood glucose levels. Requires glucose tolerance test.',
                action: 'Schedule glucose tolerance test and diet review',
                warningSigns: ['Excessive thirst', 'Frequent urination', 'Blurred vision']
            });
        } else if (blood_glucose && parseFloat(blood_glucose) > 6.7) {
            diagnoses.push({
                condition: 'Impaired Glucose Tolerance',
                risk: 'Low',
                description: 'Borderline elevated blood glucose. Monitor closely.',
                action: 'Repeat blood glucose test in 2 weeks',
                warningSigns: ['Monitor for diabetes symptoms']
            });
        }

        // Fetal distress
        if (fetal_movement === 'Reduced' || fetal_movement === 'Absent') {
            diagnoses.push({
                condition: 'Reduced Fetal Movement',
                risk: 'High',
                description: 'Decreased fetal movement detected. Requires immediate assessment.',
                action: 'Urgent fetal monitoring and clinical review',
                warningSigns: ['No fetal movement for 12 hours', 'Decreased kick count']
            });
        }

        if (fetal_heart_rate) {
            const fhr = parseInt(fetal_heart_rate);
            if (fhr < 110) {
                diagnoses.push({
                    condition: 'Fetal Bradycardia',
                    risk: 'High',
                    description: `Fetal heart rate is ${fhr} bpm (normal: 110-160 bpm).`,
                    action: 'Immediate fetal monitoring required',
                    warningSigns: ['Fetal distress', 'Hypoxia']
                });
            } else if (fhr > 160) {
                diagnoses.push({
                    condition: 'Fetal Tachycardia',
                    risk: 'Medium',
                    description: `Fetal heart rate is ${fhr} bpm (normal: 110-160 bpm).`,
                    action: 'Fetal monitoring and maternal assessment',
                    warningSigns: ['Fetal infection', 'Maternal fever']
                });
            }
        }

        // Severe Hypertension
        if (blood_pressure_systolic >= 160 || blood_pressure_diastolic >= 110) {
            diagnoses.push({
                condition: 'Severe Hypertension',
                risk: 'Critical',
                description: 'Dangerously high blood pressure. Immediate intervention required.',
                action: 'Emergency referral to hospital',
                warningSigns: ['Stroke risk', 'Organ damage risk']
            });
        }

        // Preterm labour
        if (contractions) {
            diagnoses.push({
                condition: 'Preterm Labour Risk',
                risk: 'High',
                description: 'Contractions detected before 37 weeks. Assess for preterm labour.',
                action: 'Immediate clinical assessment',
                warningSigns: ['Regular contractions', 'Lower back pain', 'Pelvic pressure']
            });
        }

        // Vaginal bleeding
        if (vaginal_bleeding) {
            diagnoses.push({
                condition: 'Vaginal Bleeding in Pregnancy',
                risk: 'Critical',
                description: 'Vaginal bleeding detected. Requires immediate assessment.',
                action: 'Emergency referral to hospital',
                warningSigns: ['Heavy bleeding', 'Abdominal pain', 'Dizziness']
            });
        }

        // Fluid leakage
        if (fluid_leakage) {
            diagnoses.push({
                condition: 'Possible Premature Rupture of Membranes',
                risk: 'High',
                description: 'Fluid leakage detected. Assess for membrane rupture.',
                action: 'Urgent clinical assessment',
                warningSigns: ['Continuous leakage', 'Infection risk']
            });
        }

        // Abnormal pulse
        if (pulse_rate && (pulse_rate < 60 || pulse_rate > 100)) {
            diagnoses.push({
                condition: pulse_rate < 60 ? 'Bradycardia' : 'Tachycardia',
                risk: 'Medium',
                description: `Pulse rate is ${pulse_rate} bpm (normal: 60-100 bpm).`,
                action: 'Monitor pulse rate and assess for underlying cause',
                warningSigns: ['Dizziness', 'Shortness of breath', 'Chest pain']
            });
        }

        // Low oxygen saturation
        if (oxygen_saturation && parseFloat(oxygen_saturation) < 95) {
            diagnoses.push({
                condition: 'Low Oxygen Saturation',
                risk: 'High',
                description: `Oxygen saturation is ${oxygen_saturation}% (normal: >95%).`,
                action: 'Administer oxygen and assess respiratory function',
                warningSigns: ['Shortness of breath', 'Cyanosis', 'Chest pain']
            });
        }

        // Fever
        if (temperature && parseFloat(temperature) > 38.0) {
            diagnoses.push({
                condition: 'Fever in Pregnancy',
                risk: 'Medium',
                description: `Temperature is ${temperature}°C. Possible infection.`,
                action: 'Assess for source of infection and treat accordingly',
                warningSigns: ['Chills', 'Sweating', 'Body aches']
            });
        }

        // Severe swelling
        if (swelling === 'Severe' && blood_pressure_systolic >= 130) {
            diagnoses.push({
                condition: 'Severe Oedema with Hypertension',
                risk: 'High',
                description: 'Severe swelling with elevated blood pressure.',
                action: 'Monitor for pre-eclampsia',
                warningSigns: ['Pulmonary oedema', 'Renal impairment']
            });
        }

        // Save diagnoses
        for (const diagnosis of diagnoses) {
            await db.execute(`
                INSERT INTO diagnoses (
                    patient_id, diagnosis, description, severity, status, diagnosis_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                patient_id,
                diagnosis.condition,
                diagnosis.description,
                diagnosis.risk.toLowerCase(),
                'active',
                new Date().toISOString().split('T')[0]
            ]);
        }

    } catch (error) {
        console.error('❌ Auto-diagnose error:', error);
    }

    return diagnoses;
}

// ─── QUEUE SMS FUNCTION ───
async function queueSMS(phoneNumber, message) {
    try {
        const db = require('../config/db');
        await db.execute(`
            INSERT INTO sms_queue (
                phone_number, message, status, created_at
            ) VALUES (?, ?, ?, NOW())
        `, [phoneNumber, message, 'pending']);
        console.log(`📱 SMS queued for ${phoneNumber}`);
    } catch (error) {
        console.error('❌ Queue SMS error:', error);
    }
}

// ─── GET REMINDERS ───
router.get('/reminders/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const reminders = await db.query(`
            SELECT * FROM maternity_reminders 
            WHERE patient_id = ? 
            ORDER BY reminder_date ASC
        `, [patientId]);

        res.json({
            success: true,
            data: reminders,
            count: reminders.length
        });

    } catch (error) {
        console.error('❌ Get reminders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reminders',
            error: error.message
        });
    }
});

// ─── GET MEDICATIONS ───
router.get('/medications/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const medications = await db.query(`
            SELECT * FROM maternity_medications 
            WHERE patient_id = ? 
            ORDER BY created_at DESC
        `, [patientId]);

        res.json({
            success: true,
            data: medications,
            count: medications.length
        });

    } catch (error) {
        console.error('❌ Get medications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medications',
            error: error.message
        });
    }
});

// ─── GET LAB TESTS ───
router.get('/lab-tests/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const labTests = await db.query(`
            SELECT * FROM maternity_lab_tests 
            WHERE patient_id = ? 
            ORDER BY test_date DESC
        `, [patientId]);

        res.json({
            success: true,
            data: labTests,
            count: labTests.length
        });

    } catch (error) {
        console.error('❌ Get lab tests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lab tests',
            error: error.message
        });
    }
});

// ─── GET REFERRALS ───
router.get('/referrals/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const referrals = await db.query(`
            SELECT * FROM maternity_referrals 
            WHERE patient_id = ? 
            ORDER BY referral_date DESC
        `, [patientId]);

        res.json({
            success: true,
            data: referrals,
            count: referrals.length
        });

    } catch (error) {
        console.error('❌ Get referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch referrals',
            error: error.message
        });
    }
});

// ─── GET FETAL ASSESSMENTS ───
router.get('/fetal-assessments/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const fetalAssessments = await db.query(`
            SELECT * FROM maternity_fetal_assessments 
            WHERE patient_id = ? 
            ORDER BY assessment_date DESC
        `, [patientId]);

        res.json({
            success: true,
            data: fetalAssessments,
            count: fetalAssessments.length
        });

    } catch (error) {
        console.error('❌ Get fetal assessments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fetal assessments',
            error: error.message
        });
    }
});

// ─── GET VITALS HISTORY ───
router.get('/vitals/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const vitals = await db.query(`
            SELECT * FROM maternity_vitals 
            WHERE patient_id = ? 
            ORDER BY recorded_at DESC
        `, [patientId]);

        res.json({
            success: true,
            data: vitals,
            count: vitals.length
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

// ─── GET VISITS ───
router.get('/visits/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const visits = await db.query(`
            SELECT * FROM maternity_visits 
            WHERE patient_id = ? 
            ORDER BY visit_date DESC
        `, [patientId]);

        res.json({
            success: true,
            data: visits,
            count: visits.length
        });

    } catch (error) {
        console.error('❌ Get visits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visits',
            error: error.message
        });
    }
});

// ─── GET POSTNATAL ───
router.get('/postnatal/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const postnatal = await db.query(`
            SELECT * FROM maternity_postnatal 
            WHERE patient_id = ? 
            ORDER BY follow_up_date DESC
        `, [patientId]);

        res.json({
            success: true,
            data: postnatal,
            count: postnatal.length
        });

    } catch (error) {
        console.error('❌ Get postnatal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch postnatal records',
            error: error.message
        });
    }
});

// ─── GET DELIVERIES ───
router.get('/deliveries/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const deliveries = await db.query(`
            SELECT * FROM maternity_deliveries 
            WHERE patient_id = ? 
            ORDER BY delivery_date DESC
        `, [patientId]);

        res.json({
            success: true,
            data: deliveries,
            count: deliveries.length
        });

    } catch (error) {
        console.error('❌ Get deliveries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deliveries',
            error: error.message
        });
    }
});

// ─── GET INVESTIGATIONS ───
router.get('/investigations/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const investigations = await db.query(`
            SELECT * FROM maternity_investigations 
            WHERE patient_id = ? 
            ORDER BY created_at DESC
        `, [patientId]);

        res.json({
            success: true,
            data: investigations,
            count: investigations.length
        });

    } catch (error) {
        console.error('❌ Get investigations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch investigations',
            error: error.message
        });
    }
});

module.exports = router;