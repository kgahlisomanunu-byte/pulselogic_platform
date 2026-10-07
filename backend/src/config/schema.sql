-- =====================================================
-- PULSE LOGIC - COMPLETE DATABASE REPLACEMENT SCRIPT
-- This will DROP your existing database and create a new one
-- =====================================================

-- Drop database if it already exists
DROP DATABASE IF EXISTS pulselogic_db;

-- Create fresh database
CREATE DATABASE pulselogic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE pulselogic_db;

-- =====================================================
-- 1. FACILITIES TABLE
-- =====================================================
CREATE TABLE facilities (
    facility_id INT PRIMARY KEY AUTO_INCREMENT,
    facility_name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) NOT NULL,
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    district VARCHAR(100),
    province VARCHAR(100),
    contact_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. DEPARTMENTS TABLE
-- =====================================================
CREATE TABLE departments (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    facility_id INT,
    department_name VARCHAR(255) NOT NULL,
    department_code VARCHAR(50) UNIQUE,
    hod_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id)
);

-- =====================================================
-- 3. USERS TABLE
-- =====================================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    facility_id INT,
    department_id INT,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    password_hash VARCHAR(255) NOT NULL,
    is_first_login BOOLEAN DEFAULT TRUE,
    temporary_password VARCHAR(255),
    temp_password_expires TIMESTAMP,
    password_changed_at TIMESTAMP,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP,
    otp_attempts INT DEFAULT 0,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- =====================================================
-- 4. PATIENTS TABLE
-- =====================================================
CREATE TABLE patients (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    id_number VARCHAR(20) UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    street_address VARCHAR(255),
    province VARCHAR(100),
    city VARCHAR(100),
    smart_card_id VARCHAR(100) UNIQUE,
    smart_card_issued BOOLEAN DEFAULT FALSE,
    biometric_enrolled BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    registration_date DATE,
    registered_at INT,
    registered_by INT,
    total_visits INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_at) REFERENCES facilities(facility_id),
    FOREIGN KEY (registered_by) REFERENCES users(user_id)
);

-- =====================================================
-- 5. NEXT OF KIN TABLE
-- =====================================================
CREATE TABLE next_of_kin (
    next_of_kin_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- =====================================================
-- 6. PATIENT VISITS TABLE
-- =====================================================
CREATE TABLE patient_visits (
    visit_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    facility_id INT NOT NULL,
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    check_in_time TIMESTAMP,
    waiting_time_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id)
);

-- =====================================================
-- 7. OTP VERIFICATIONS TABLE
-- =====================================================
CREATE TABLE otp_verifications (
    otp_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_id INT,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (visit_id) REFERENCES patient_visits(visit_id)
);

-- =====================================================
-- 8. QUEUE TABLE
-- =====================================================
CREATE TABLE queue (
    queue_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_id INT NOT NULL,
    facility_id INT NOT NULL,
    department_id INT,
    priority_score INT DEFAULT 0,
    priority_level VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'waiting',
    position INT,
    check_in_time TIMESTAMP,
    nurse_start_time TIMESTAMP,
    nurse_end_time TIMESTAMP,
    doctor_start_time TIMESTAMP,
    doctor_end_time TIMESTAMP,
    waiting_time_minutes INT,
    waiting_time_alert BOOLEAN DEFAULT FALSE,
    assigned_nurse_id INT,
    assigned_doctor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (visit_id) REFERENCES patient_visits(visit_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (assigned_nurse_id) REFERENCES users(user_id),
    FOREIGN KEY (assigned_doctor_id) REFERENCES users(user_id)
);

-- =====================================================
-- 9. VITALS TABLE
-- =====================================================
CREATE TABLE vitals (
    vital_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_id INT NOT NULL,
    nurse_id INT,
    temperature DECIMAL(4,1),
    heart_rate INT,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    oxygen_saturation INT,
    blood_glucose DECIMAL(5,2),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    measurement_method VARCHAR(50),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (visit_id) REFERENCES patient_visits(visit_id),
    FOREIGN KEY (nurse_id) REFERENCES users(user_id)
);

-- =====================================================
-- 10. DIAGNOSES TABLE
-- =====================================================
CREATE TABLE diagnoses (
    diagnosis_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_id INT NOT NULL,
    doctor_id INT NOT NULL,
    icd10_code VARCHAR(20),
    diagnosis TEXT NOT NULL,
    diagnosis_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (visit_id) REFERENCES patient_visits(visit_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
);

-- =====================================================
-- 11. PRESCRIPTIONS TABLE
-- =====================================================
CREATE TABLE prescriptions (
    prescription_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_id INT NOT NULL,
    doctor_id INT NOT NULL,
    medication VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    quantity INT,
    status VARCHAR(50) DEFAULT 'pending',
    pharmacist_id INT,
    dispensed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (visit_id) REFERENCES patient_visits(visit_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id),
    FOREIGN KEY (pharmacist_id) REFERENCES users(user_id)
);

-- =====================================================
-- 12. REFERRALS TABLE
-- =====================================================
CREATE TABLE referrals (
    referral_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    referring_doctor_id INT NOT NULL,
    from_facility_id INT NOT NULL,
    to_facility_id INT NOT NULL,
    reason TEXT,
    priority VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    referral_date DATE,
    sent_at TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    clinical_notes TEXT,
    results_sent_back BOOLEAN DEFAULT FALSE,
    results_sent_back_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (referring_doctor_id) REFERENCES users(user_id),
    FOREIGN KEY (from_facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (to_facility_id) REFERENCES facilities(facility_id)
);

-- =====================================================
-- 13. APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE appointments (
    appointment_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    facility_id INT NOT NULL,
    doctor_id INT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'scheduled',
    sms_reminder_sent BOOLEAN DEFAULT FALSE,
    checked_in BOOLEAN DEFAULT FALSE,
    missed_appointment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
);

-- =====================================================
-- 14. MATERNITY RECORDS TABLE
-- =====================================================
CREATE TABLE maternity_records (
    maternity_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    facility_id INT NOT NULL,
    expected_due_date DATE,
    gestational_weeks INT,
    gravida INT,
    para INT,
    living_children INT,
    maternal_age INT,
    blood_pressure VARCHAR(50),
    protein_in_urine VARCHAR(50),
    swelling VARCHAR(50),
    blurred_vision BOOLEAN DEFAULT FALSE,
    vaginal_bleeding BOOLEAN DEFAULT FALSE,
    fetal_movement VARCHAR(50),
    complications TEXT,
    risk_factors TEXT,
    referral_alert BOOLEAN DEFAULT FALSE,
    referral_alert_reason TEXT,
    labour_stage VARCHAR(50),
    delivery_date DATE,
    delivery_type VARCHAR(50),
    delivery_outcome VARCHAR(50),
    baby_weight DECIMAL(5,2),
    baby_gender VARCHAR(20),
    baby_apgar_score INT,
    postnatal_care TEXT,
    maternal_condition VARCHAR(50),
    baby_condition VARCHAR(50),
    risk_level VARCHAR(20) DEFAULT 'low',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id)
);

-- =====================================================
-- 15. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    type VARCHAR(50),
    channel VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    content TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- =====================================================
-- 16. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =====================================================
-- 17. REPORTS TABLE
-- =====================================================
CREATE TABLE reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100),
    facility_id INT,
    department_id INT,
    district VARCHAR(100),
    province VARCHAR(100),
    start_date DATE,
    end_date DATE,
    report_data JSON,
    summary TEXT,
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_url VARCHAR(255),
    format VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    exported_count INT DEFAULT 0,
    approved_by INT,
    approved_at TIMESTAMP,
    approval_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (generated_by) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

-- =====================================================
-- 18. LAB REQUESTS TABLE
-- =====================================================
CREATE TABLE lab_requests (
    lab_request_id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id INT,
    patient_id INT NOT NULL,
    facility_id INT NOT NULL,
    lab_id INT NOT NULL,
    doctor_id INT NOT NULL,
    test_type VARCHAR(100) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'pending',
    results TEXT,
    result_summary TEXT,
    uploaded_at TIMESTAMP,
    doctor_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (lab_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id),
    FOREIGN KEY (referral_id) REFERENCES referrals(referral_id) ON DELETE SET NULL
);

-- =====================================================
-- 19. IMAGING REQUESTS TABLE
-- =====================================================
CREATE TABLE imaging_requests (
    imaging_request_id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id INT,
    patient_id INT NOT NULL,
    facility_id INT NOT NULL,
    imaging_facility_id INT NOT NULL,
    doctor_id INT NOT NULL,
    imaging_type VARCHAR(100) NOT NULL,
    body_part VARCHAR(255) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'pending',
    report TEXT,
    image_urls JSON,
    uploaded_at TIMESTAMP,
    doctor_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (imaging_facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id),
    FOREIGN KEY (referral_id) REFERENCES referrals(referral_id) ON DELETE SET NULL
);

-- =====================================================
-- 20. DOH REPORTS TABLE
-- =====================================================
CREATE TABLE doh_reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100),
    district VARCHAR(100),
    province VARCHAR(100),
    start_date DATE,
    end_date DATE,
    report_data JSON,
    summary TEXT,
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(user_id)
);

-- =====================================================
-- This setup script inserts no records. Add real facilities, nurses, and patients through the application.
