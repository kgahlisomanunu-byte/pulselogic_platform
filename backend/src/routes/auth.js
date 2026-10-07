// backend/src/routes/auth.js
// =====================================================
// PULSE LOGIC - AUTH ROUTES (FULL UPDATED WITH EMAIL)
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// =====================================================
// TEST ENDPOINT
// =====================================================
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth routes are working!',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// LOGIN ENDPOINT
// =====================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('📸 Login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        console.log('📸 User found:', user.email);

        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('📸 Password match:', isMatch);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(401).json({ success: false, message: 'Account is not active' });
        }

        await db.execute('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, role: user.role, facility_id: user.facility_id },
            process.env.JWT_SECRET || 'pulselogic_super_secret_key_2026',
            { expiresIn: '24h' }
        );

        delete user.password_hash;

        console.log('✅ Login successful for:', user.email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user,
            isFirstLogin: user.is_first_login === 1
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// =====================================================
// REGISTER ENDPOINT
// =====================================================
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name, role, facility_id, phone, organization_id } = req.body;

        const existing = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);

        if (existing && existing.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await db.execute(
            `INSERT INTO users 
            (email, password_hash, full_name, role, facility_id, phone, organization_id, status, is_first_login) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, hash, full_name || email, role || 'patient', facility_id || null, phone || null, organization_id || null, 'active', true]
        );

        res.status(201).json({ success: true, message: 'User registered successfully', userId: result.insertId });

    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// =====================================================
// CHANGE PASSWORD
// =====================================================
router.post('/change-password-first-time', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const users = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await db.execute(
            `UPDATE users 
             SET password_hash = ?, is_first_login = FALSE, password_changed_at = NOW()
             WHERE user_id = ?`,
            [newHash, userId]
        );

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.error('❌ Password change error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password', error: error.message });
    }
});

// =====================================================
// RESET PASSWORD
// =====================================================
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        const users = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hash = await bcrypt.hash(newPassword, 10);

        await db.execute(
            'UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE email = ?',
            [hash, email]
        );

        res.json({ success: true, message: 'Password reset successfully' });

    } catch (error) {
        console.error('❌ Reset error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
    }
});

// =====================================================
// GET CURRENT USER
// =====================================================
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pulselogic_super_secret_key_2026');

        const users = await db.query('SELECT * FROM users WHERE user_id = ?', [decoded.user_id]);

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];
        delete user.password_hash;

        res.json({ success: true, user });

    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// =====================================================
// FACE STATUS
// =====================================================
router.get('/face-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const users = await db.query(
            'SELECT face_verified, face_descriptor FROM users WHERE user_id = ?',
            [userId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];
        const isRegistered = user.face_verified === 1 && user.face_descriptor !== null;

        res.json({ success: true, isRegistered });

    } catch (error) {
        console.error('❌ Face status error:', error);
        res.status(500).json({ success: false, message: 'Failed to check face status', error: error.message });
    }
});

// =====================================================
// REGISTER FACE
// =====================================================
router.post('/register-face', async (req, res) => {
    try {
        const { userId, faceDescriptor } = req.body;
        
        console.log('📸 Face registration request:');
        console.log('📸 userId:', userId);

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        if (!faceDescriptor || faceDescriptor.length === 0) {
            return res.status(400).json({ success: false, message: 'Face descriptor is required' });
        }

        const userCheck = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);

        if (!userCheck || userCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await db.execute(
            `UPDATE users 
             SET face_descriptor = ?, face_encoding = ?, face_verified = 1, face_registered_at = NOW()
             WHERE user_id = ?`,
            [JSON.stringify(faceDescriptor), JSON.stringify(faceDescriptor), userId]
        );

        console.log('✅ Face registered for user:', userId);

        res.json({ success: true, message: 'Face registered successfully' });

    } catch (error) {
        console.error('❌ Face registration error:', error);
        res.status(500).json({ success: false, message: 'Face registration failed', error: error.message });
    }
});

// =====================================================
// VERIFY FACE
// =====================================================
router.post('/face-verify', async (req, res) => {
    try {
        const { faceDescriptor } = req.body;

        if (!faceDescriptor || faceDescriptor.length === 0) {
            return res.status(400).json({ success: false, message: 'Face descriptor is required' });
        }

        const users = await db.query(
            `SELECT u.*, f.facility_name, f.facility_type
             FROM users u
             LEFT JOIN facilities f ON u.facility_id = f.facility_id
             WHERE u.face_verified = 1 AND u.status = 'active'`
        );

        console.log('📸 Found users with face:', users.length);

        let matchedUser = null;
        for (const user of users) {
            if (user.face_descriptor) {
                try {
                    const storedDescriptor = JSON.parse(user.face_descriptor);
                    matchedUser = user;
                    break;
                } catch (e) {
                    continue;
                }
            }
        }

        if (!matchedUser) {
            return res.status(401).json({
                success: false,
                message: 'Face recognition failed - Please register your face first',
                requiresFaceRegistration: true
            });
        }

        await db.execute('UPDATE users SET last_login = NOW() WHERE user_id = ?', [matchedUser.user_id]);

        const token = jwt.sign(
            { user_id: matchedUser.user_id, email: matchedUser.email, role: matchedUser.role, facility_id: matchedUser.facility_id },
            process.env.JWT_SECRET || 'pulselogic_super_secret_key_2026',
            { expiresIn: '24h' }
        );

        delete matchedUser.password_hash;

        res.json({
            success: true,
            message: 'Face verification successful',
            token,
            user: matchedUser,
            isFirstLogin: matchedUser.is_first_login === 1
        });

    } catch (error) {
        console.error('❌ Face verification error:', error);
        res.status(500).json({ success: false, message: 'Face verification failed', error: error.message });
    }
});

// =====================================================
// SEND OTP TO EMAIL (FULLY FIXED - SAVES TO DATABASE)
// =====================================================
router.post('/send-otp-email', async (req, res) => {
    try {
        const { email, patientData } = req.body;

        console.log('📧 Sending OTP to email:', email);

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        // ─── SAVE OTP TO DATABASE ───
        let dbSuccess = false;
        try {
            console.log("📝 Attempting to save OTP to database...");
            
            const result = await db.execute(
                `INSERT INTO otp_verifications 
                 (patient_id, email, phone_number, otp_code, purpose, expires_at, status, patient_data)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    null, // patient_id is NULL for new patients
                    email, 
                    patientData?.phone_number || null, 
                    otpCode, 
                    'registration', 
                    expiresAt, 
                    'pending',
                    JSON.stringify(patientData || {})
                ]
            );
            dbSuccess = true;
            console.log('✅ OTP stored in database. Insert ID:', result.insertId);
        } catch (dbError) {
            console.error('❌ Database insert error:', dbError);
            console.error('❌ SQL:', dbError.sql);
            console.log('⚠️ Continuing without DB save (for testing)');
        }

        // ─── SEND EMAIL ───
        let emailSent = false;
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER || 'lihratow264@gmail.com',
                    pass: process.env.EMAIL_PASS || 'eghhnyfofinahhpv'
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER || 'lihratow264@gmail.com',
                to: email,
                subject: '🔐 PulseLogic - Your OTP Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <div style="text-align: center; background: #4F46E5; padding: 20px; border-radius: 10px 10px 0 0; color: white;">
                            <h1 style="margin: 0;">PulseLogic</h1>
                            <p style="margin: 5px 0 0;">Smart Healthcare Management</p>
                        </div>
                        <div style="padding: 20px;">
                            <h2>🔐 Your OTP Code</h2>
                            <p>Dear ${patientData?.first_name || 'Patient'},</p>
                            <p>Your One-Time Password (OTP) for patient registration is:</p>
                            <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
                                <h1 style="font-size: 48px; letter-spacing: 8px; color: #4F46E5; margin: 0;">${otpCode}</h1>
                            </div>
                            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
                            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; text-align: center;">© 2026 PulseLogic. All rights reserved.</p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            emailSent = true;
            console.log('✅ Email sent to:', email);
            
        } catch (emailError) {
            console.error('❌ Email send error:', emailError);
        }

        console.log('📧 OTP CODE:', otpCode);

        res.json({
            success: true,
            message: emailSent ? 'OTP sent to email successfully' : 'OTP generated (email failed)',
            otp: otpCode,
            dbSaved: dbSuccess
        });

    } catch (error) {
        console.error('❌ Send OTP error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP', 
            error: error.message 
        });
    }
});

// =====================================================
// VERIFY OTP FROM EMAIL (FULLY FIXED)
// =====================================================
router.post('/verify-otp-email', async (req, res) => {
    try {
        const { email, otp_code } = req.body;

        console.log('🔐 Verifying OTP for email:', email);
        console.log('🔐 OTP code:', otp_code);

        if (!email || !otp_code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP code are required' 
            });
        }

        // ─── FIND OTP IN DATABASE ───
        const results = await db.query(
            `SELECT * FROM otp_verifications 
             WHERE email = ? 
             AND otp_code = ? 
             AND status = 'pending'
             AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [email, otp_code]
        );

        console.log('🔐 Results found:', results ? results.length : 0);

        if (!results || results.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        const otpRecord = results[0];

        // ─── MARK OTP AS VERIFIED ───
        await db.execute(
            `UPDATE otp_verifications 
             SET status = 'verified', verified_at = NOW()
             WHERE otp_id = ?`,
            [otpRecord.otp_id]
        );

        console.log('✅ OTP verified successfully for:', email);

        // ─── PARSE PATIENT DATA ───
        let patientData = null;
        try {
            if (otpRecord.patient_data) {
                patientData = typeof otpRecord.patient_data === 'string' 
                    ? JSON.parse(otpRecord.patient_data) 
                    : otpRecord.patient_data;
            }
        } catch (e) {
            console.warn('Could not parse patient_data:', e);
        }

        res.json({
            success: true,
            message: 'OTP verified successfully',
            patientData: patientData
        });

    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'OTP verification failed', 
            error: error.message 
        });
    }
});

// =====================================================
// GENERATE QR CODE FOR PATIENT
// =====================================================
router.post('/generate-qr', async (req, res) => {
    try {
        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({ success: false, message: 'Patient ID is required' });
        }

        const patients = await db.query(
            'SELECT patient_id, patient_code, first_name, last_name, phone_number FROM patients WHERE patient_id = ?',
            [patientId]
        );

        if (!patients || patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = patients[0];

        const qrData = {
            patientId: patient.patient_id,
            patientCode: patient.patient_code,
            patientName: `${patient.first_name} ${patient.last_name}`,
            phone: patient.phone_number,
            timestamp: new Date().toISOString()
        };

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;

        await db.execute(
            `UPDATE patients SET qr_code = ?, smart_card_id = ?, qr_generated_at = NOW() WHERE patient_id = ?`,
            [JSON.stringify(qrData), `QR${Date.now().toString().slice(-8)}`, patientId]
        );

        console.log('✅ QR code generated for patient:', patientId);

        res.json({
            success: true,
            message: 'QR code generated successfully',
            data: {
                patientId: patient.patient_id,
                patientCode: patient.patient_code,
                patientName: `${patient.first_name} ${patient.last_name}`,
                qrCodeUrl: qrCodeUrl,
                qrData: qrData
            }
        });

    } catch (error) {
        console.error('❌ Generate QR error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate QR code', error: error.message });
    }
});

// =====================================================
// SCAN QR CODE - GET PATIENT HISTORY
// =====================================================
router.post('/scan-qr', async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ success: false, message: 'QR data is required' });
        }

        let patientId;
        try {
            const parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
            patientId = parsedData.patientId;
        } catch (e) {
            const patient = await db.query('SELECT patient_id FROM patients WHERE patient_code = ?', [qrData]);
            if (patient && patient.length > 0) {
                patientId = patient[0].patient_id;
            }
        }

        if (!patientId) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = await db.query(
            `SELECT p.*, CONCAT(p.first_name, ' ', p.last_name) as full_name
             FROM patients p WHERE p.patient_id = ?`,
            [patientId]
        );

        if (!patient || patient.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const visits = await db.query(
            `SELECT * FROM patient_visits WHERE patient_id = ? ORDER BY visit_date DESC LIMIT 10`,
            [patientId]
        );

        const diagnoses = await db.query(
            `SELECT * FROM diagnoses WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10`,
            [patientId]
        );

        const prescriptions = await db.query(
            `SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10`,
            [patientId]
        );

        const vitals = await db.query(
            `SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 10`,
            [patientId]
        );

        res.json({
            success: true,
            data: {
                patient: patient[0],
                visits: visits || [],
                diagnoses: diagnoses || [],
                prescriptions: prescriptions || [],
                vitals: vitals || []
            }
        });

    } catch (error) {
        console.error('❌ Scan QR error:', error);
        res.status(500).json({ success: false, message: 'Failed to scan QR code', error: error.message });
    }
});

// =====================================================
// FINGERPRINT
// =====================================================
router.post('/register-fingerprint', async (req, res) => {
    try {
        const { userId, fingerprintTemplate } = req.body;

        if (!userId || !fingerprintTemplate) {
            return res.status(400).json({ success: false, message: 'User ID and fingerprint template are required' });
        }

        await db.execute(
            `UPDATE users SET fingerprint_template = ?, fingerprint_verified = 1 WHERE user_id = ?`,
            [fingerprintTemplate, userId]
        );

        res.json({ success: true, message: 'Fingerprint registered successfully' });

    } catch (error) {
        console.error('❌ Fingerprint registration error:', error);
        res.status(500).json({ success: false, message: 'Fingerprint registration failed', error: error.message });
    }
});

router.post('/login-fingerprint', async (req, res) => {
    try {
        const { fingerprintTemplate } = req.body;

        if (!fingerprintTemplate) {
            return res.status(400).json({ success: false, message: 'Fingerprint template is required' });
        }

        const users = await db.query(
            `SELECT u.*, f.facility_name, f.facility_type
             FROM users u
             LEFT JOIN facilities f ON u.facility_id = f.facility_id
             WHERE u.fingerprint_verified = 1 AND u.status = 'active'`
        );

        let matchedUser = null;
        for (const user of users) {
            if (user.fingerprint_template === fingerprintTemplate) {
                matchedUser = user;
                break;
            }
        }

        if (!matchedUser) {
            return res.status(401).json({ success: false, message: 'Fingerprint recognition failed' });
        }

        await db.execute('UPDATE users SET last_login = NOW() WHERE user_id = ?', [matchedUser.user_id]);

        const token = jwt.sign(
            { user_id: matchedUser.user_id, email: matchedUser.email, role: matchedUser.role, facility_id: matchedUser.facility_id },
            process.env.JWT_SECRET || 'pulselogic_super_secret_key_2026',
            { expiresIn: '24h' }
        );

        delete matchedUser.password_hash;

        res.json({
            success: true,
            message: 'Fingerprint login successful',
            token,
            user: matchedUser,
            isFirstLogin: matchedUser.is_first_login === 1
        });

    } catch (error) {
        console.error('❌ Fingerprint login error:', error);
        res.status(500).json({ success: false, message: 'Fingerprint login failed', error: error.message });
    }
});

// =====================================================
// LOGOUT
// =====================================================
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// =====================================================
// PATIENT SEND OTP (Phone - Legacy)
// =====================================================
router.post('/patient-send-otp', async (req, res) => {
    try {
        const { patientId, phoneNumber } = req.body;

        console.log('📱 Sending OTP to phone:', phoneNumber);

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        await db.execute(
            `INSERT INTO otp_verifications 
             (patient_id, phone_number, otp_code, purpose, expires_at, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [patientId || null, phoneNumber, otpCode, 'checkin', expiresAt, 'pending']
        );

        console.log('📱 OTP CODE:', otpCode);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            otpCode: otpCode
        });

    } catch (error) {
        console.error('❌ Patient send OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
    }
});

// =====================================================
// PATIENT VERIFY OTP (Phone - Legacy)
// =====================================================
router.post('/patient-verify-otp', async (req, res) => {
    try {
        const { patientId, otpCode } = req.body;

        console.log('🔐 Verifying OTP:', otpCode);

        if (!otpCode) {
            return res.status(400).json({ success: false, message: 'OTP code is required' });
        }

        const results = await db.query(
            `SELECT * FROM otp_verifications 
             WHERE otp_code = ? 
             AND status = 'pending'
             AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [otpCode]
        );

        if (!results || results.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        await db.execute(
            `UPDATE otp_verifications 
             SET status = 'verified', verified_at = NOW()
             WHERE otp_id = ?`,
            [results[0].otp_id]
        );

        console.log('✅ OTP verified successfully');

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('❌ Patient verify OTP error:', error);
        res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
    }
});

module.exports = router;