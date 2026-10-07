// frontend/src/pages/PatientRegistration.jsx
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import './styles/patientregistration.css';

function PatientRegistration() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('reception');
  const [facilities, setFacilities] = useState([]);
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // ─── FACE SCAN STATE ───
  const [showCamera, setShowCamera] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectIntervalRef = useRef(null);

  // ─── OTP STATE ───
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(600);
  const [otpResendDisabled, setOtpResendDisabled] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // ─── QR CODE STATE ───
  const [qrCodeData, setQrCodeData] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [patientId, setPatientId] = useState(null);

  const [formData, setFormData] = useState({
    id_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone_number: '',
    alternate_phone: '',
    email: '',
    street_address: '',
    province: '',
    city: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    registered_at: '',
    registered_by: ''
  });

  const provinces = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ];

  const genders = ['Male', 'Female', 'Other'];
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // ─── EXTRACT DOB AND GENDER FROM SA ID ───
  const extractFromID = (idNumber) => {
    if (!idNumber || idNumber.length !== 13) return { dob: '', gender: '' };

    try {
      // Extract date of birth (YYMMDD)
      const year = idNumber.substring(0, 2);
      const month = idNumber.substring(2, 4);
      const day = idNumber.substring(4, 6);

      // Convert 2-digit year to 4-digit
      const fullYear = parseInt(year) > 25 ? `19${year}` : `20${year}`;
      const dob = `${fullYear}-${month}-${day}`;

      // Extract gender (digits 7-10)
      const genderDigits = parseInt(idNumber.substring(6, 10));
      const gender = genderDigits >= 5000 ? 'Male' : 'Female';

      return { dob, gender };
    } catch (error) {
      console.error('Error extracting from ID:', error);
      return { dob: '', gender: '' };
    }
  };

  // ─── HANDLE ID NUMBER CHANGE ───
  const handleIdNumberChange = (e) => {
    const idNumber = e.target.value.replace(/\D/g, ''); // Only digits
    setFormData({ ...formData, id_number: idNumber });

    if (idNumber.length === 13) {
      const { dob, gender } = extractFromID(idNumber);
      if (dob) {
        setFormData(prev => ({
          ...prev,
          id_number: idNumber,
          date_of_birth: dob,
          gender: gender
        }));
        setError('');
      } else {
        setError('Invalid ID number format');
      }
    }
  };

  // ─── LOAD FACE API MODELS ───
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('🔄 Loading face models...');
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        setModelsLoaded(true);
        console.log('✅ All face models loaded successfully');
      } catch (err) {
        console.error('❌ Error loading face models:', err);
        setError('Failed to load face models. Please refresh and try again.');
      }
    };
    loadModels();

    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setUser(userData);
      setRole(userData.role);
      setFormData(prev => ({
        ...prev,
        registered_by: userData.id || '',
        registered_at: userData.facility?.id || 1
      }));
    }

    fetchFacilities();

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
      }
    };
  }, []);

  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/facilities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFacilities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching facilities:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
    if (success) setSuccess(false);
  };

  // ─── FACE DETECTION ───
  const detectFace = async () => {
    if (!webcamRef.current || !modelsLoaded || !showCamera) return;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4 || video.videoWidth === 0) return;

    setIsDetecting(true);

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        console.log('✅ Face detected!');
        setFaceDetected(true);
        setFaceDescriptor(detection.descriptor);

        if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (!capturedFaceImage) {
            setCapturedFaceImage(imageSrc);
          }
        }

        if (canvasRef.current && video) {
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetection = faceapi.resizeResults(detection, displaySize);

          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          const box = resizedDetection.detection.box;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          const landmarks = resizedDetection.landmarks.positions;
          ctx.fillStyle = '#00ff00';
          landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      } else {
        setFaceDetected(false);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const startFaceDetection = () => {
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    detectIntervalRef.current = setInterval(detectFace, 200);
  };

  const startCamera = () => {
    setShowCamera(true);
    setFaceDetected(false);
    setFaceDescriptor(null);
    setCapturedFaceImage(null);
    setIsFaceVerified(false);
    setIsDetecting(false);
    setError('');
    
    setTimeout(() => {
      if (webcamRef.current && webcamRef.current.video) {
        const video = webcamRef.current.video;
        if (video.readyState === 4 && video.videoWidth > 0) {
          startFaceDetection();
        }
      }
    }, 1500);
  };

  const stopCamera = () => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    setShowCamera(false);
    setFaceDetected(false);
    setFaceDescriptor(null);
    setCapturedFaceImage(null);
    setIsFaceVerified(false);
    setIsDetecting(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // ─── REGISTER FACE ───
  const registerFace = async () => {
    if (!faceDescriptor) {
      setError('No face detected. Please look at the camera.');
      return;
    }

    setIsRegisteringFace(true);
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId') || user?.id || 1;

      const response = await fetch(`${API_URL}/auth/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          faceDescriptor: Array.from(faceDescriptor)
        })
      });
      const data = await response.json();

      if (data.success) {
        alert('✅ Face registered successfully!');
        setIsFaceVerified(true);
        stopCamera();
        setStep(5);
        completeRegistration();
      } else {
        setError(data.message || 'Failed to register face');
      }
    } catch (error) {
      setError('Error registering face');
      console.error('Register face error:', error);
    } finally {
      setLoading(false);
      setIsRegisteringFace(false);
    }
  };

  // ─── SEND OTP TO EMAIL ───
  const sendOTP = async () => {
    try {
      const email = formData.email;
      if (!email) {
        setError('Email is required');
        return;
      }

      console.log('📧 Sending OTP to email:', email);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/send-otp-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email,
          patientData: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setOtpTimer(600);
        setOtpResendDisabled(true);
        alert(`✅ OTP sent to ${email}\n\n📧 Your OTP: ${data.otp}\n⏰ Expires in 10 minutes.`);
        setTimeout(() => setOtpResendDisabled(false), 30000);
        setShowOtpVerification(true);
        setStep(2);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      setError('Error sending OTP');
    }
  };

  // ─── VERIFY OTP ───
  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/verify-otp-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email,
          otp_code: otpCode
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ OTP verified successfully!');
        setOtpVerified(true);
        setShowOtpVerification(false);
        setOtpSent(false);
        generateQRCode();
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      setError('Error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = () => {
    if (formData.email) {
      sendOTP();
    } else {
      setError('Email not found. Please go back and enter it.');
    }
  };

  // ─── GENERATE QR CODE ───
  const generateQRCode = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          otp_verified: true,
          registered_by: user?.id || 1
        })
      });

      const data = await response.json();

      if (data.success) {
        const newPatientId = data.patient?.patient_id || data.patientId;
        setPatientId(newPatientId);
        localStorage.setItem('patientId', newPatientId);

        const qrResponse = await fetch(`${API_URL}/auth/generate-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ patientId: newPatientId })
        });

        const qrData = await qrResponse.json();

        if (qrData.success) {
          setQrCodeData(qrData.data);
          setShowQRCode(true);
          setStep(3);
          alert(`✅ Patient ${formData.first_name} ${formData.last_name} registered!\n📱 QR code generated! Please scan face next.`);
        } else {
          setError(qrData.message || 'Failed to generate QR code');
        }
      } else {
        setError(data.message || 'Failed to register patient');
      }
    } catch (error) {
      console.error('❌ Generate QR error:', error);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  // ─── COMPLETE REGISTRATION ───
  const completeRegistration = () => {
    setRegistrationComplete(true);
    setSuccess(true);
    setStep(5);
    alert(`✅ Patient ${formData.first_name} ${formData.last_name} fully registered with Face + QR Code!`);
  };

  // ─── GO TO FACE SCAN ───
  const goToFaceScan = () => {
    setShowQRCode(false);
    setStep(4);
    startCamera();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (otpSent && otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    } else if (otpTimer === 0) {
      setOtpSent(false);
      setError('OTP has expired. Please request a new one.');
    }
  }, [otpSent, otpTimer]);

  // ─── RENDER ───
  return (
    <div className="registration-container">
      <Sidebar role={role} />
      <div className="registration-main">
        <Header role={role} />
        <div className="registration-content">
          <div className="registration-header">
            <div>
              <h1>📝 Patient Registration</h1>
              <p className="registration-subtitle">
                {step === 1 ? 'Step 1: Personal Information' :
                 step === 2 ? 'Step 2: OTP Verification' :
                 step === 3 ? 'Step 3: QR Code Generated' :
                 step === 4 ? 'Step 4: Face Scan' :
                 '✅ Complete!'}
              </p>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={() => window.history.back()}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </div>

          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Personal Info</span>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">OTP</span>
            </div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">QR Code</span>
            </div>
            <div className={`step-line ${step >= 4 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>
              <span className="step-number">4</span>
              <span className="step-label">Face Scan</span>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {success && registrationComplete && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i>
              <span>✅ Patient registered successfully with Face + QR Code!</span>
            </div>
          )}

          {/* ─── STEP 1: PERSONAL INFORMATION ─── */}
          {step === 1 && !showOtpVerification && !showQRCode && (
            <div className="registration-card">
              <form onSubmit={(e) => { e.preventDefault(); sendOTP(); }}>
                <div className="form-section">
                  <h3><i className="fas fa-id-card"></i> SA ID Number</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>ID Number *</label>
                      <input
                        type="text"
                        name="id_number"
                        value={formData.id_number}
                        onChange={handleIdNumberChange}
                        placeholder="Enter 13-digit SA ID number"
                        maxLength="13"
                        required
                        className="id-input"
                      />
                      <small className="id-hint">
                        <i className="fas fa-info-circle"></i> 
                        Enter your 13-digit South African ID number to auto-fill DOB and Gender
                      </small>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-user"></i> Personal Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className={formData.date_of_birth ? 'auto-filled' : ''}
                        readOnly={formData.date_of_birth ? true : false}
                      />
                      {formData.date_of_birth && (
                        <small className="auto-filled-label">
                          <i className="fas fa-magic"></i> Auto-filled from ID
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={formData.gender ? 'auto-filled' : ''}
                      >
                        <option value="">Select Gender</option>
                        {genders.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      {formData.gender && (
                        <small className="auto-filled-label">
                          <i className="fas fa-magic"></i> Auto-filled from ID
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-phone"></i> Contact Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        placeholder="082 123 4567"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Alternate Phone</label>
                      <input
                        type="tel"
                        name="alternate_phone"
                        value={formData.alternate_phone}
                        onChange={handleInputChange}
                        placeholder="082 123 4567"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="patient@email.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-map-marker-alt"></i> Address</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Street Address</label>
                      <input
                        type="text"
                        name="street_address"
                        value={formData.street_address}
                        onChange={handleInputChange}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="form-group">
                      <label>City/Town</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                      />
                    </div>
                    <div className="form-group">
                      <label>Province</label>
                      <select
                        name="province"
                        value={formData.province}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Province</option>
                        {provinces.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-ambulance"></i> Emergency Contact</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Contact Name</label>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Phone</label>
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                        placeholder="082 123 4567"
                      />
                    </div>
                    <div className="form-group">
                      <label>Relationship</label>
                      <input
                        type="text"
                        name="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship}
                        onChange={handleInputChange}
                        placeholder="e.g. Spouse, Parent"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => window.history.back()}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Sending OTP...</>
                    ) : (
                      <><i className="fas fa-envelope"></i> Send OTP</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── STEP 2: OTP VERIFICATION ─── */}
          {showOtpVerification && step === 2 && (
            <div className="otp-section">
              <div className="otp-card">
                <div className="otp-header">
                  <i className="fas fa-envelope" style={{ color: '#534AB7' }}></i>
                  <h3>Email Verification</h3>
                  <p>Enter the OTP sent to <strong>{formData.email}</strong></p>
                </div>
                <p className="otp-timer">
                  <i className="fas fa-clock"></i> Expires in: <strong>{formatTime(otpTimer)}</strong>
                </p>
                <div className="otp-input-group">
                  <input
                    type="text"
                    className="otp-input"
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={(e) => e.key === 'Enter' && verifyOTP()}
                  />
                  <button className="btn-verify-otp" onClick={verifyOTP} disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>} Verify
                  </button>
                </div>
                <button
                  className="btn-resend-otp"
                  onClick={resendOTP}
                  disabled={otpResendDisabled}
                >
                  {otpResendDisabled ? 'Resend available in 30s' : <><i className="fas fa-redo"></i> Resend OTP</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: QR CODE ─── */}
          {showQRCode && step === 3 && qrCodeData && (
            <div className="qr-section">
              <div className="qr-card">
                <h3><i className="fas fa-qrcode"></i> Patient QR Code</h3>
                <div className="qr-code-container">
                  <img src={qrCodeData.qrCodeUrl} alt="Patient QR Code" className="qr-code-image" />
                </div>
                <div className="qr-info">
                  <p><strong>Patient:</strong> {qrCodeData.patientName}</p>
                  <p><strong>Code:</strong> {qrCodeData.patientCode}</p>
                  <p><strong>ID:</strong> {qrCodeData.patientId}</p>
                </div>
                <div className="qr-actions">
                  <button className="btn-download-qr" onClick={() => window.open(qrCodeData.qrCodeUrl, '_blank')}>
                    <i className="fas fa-download"></i> Download QR
                  </button>
                  <button className="btn-face-scan" onClick={goToFaceScan}>
                    <i className="fas fa-face-smile"></i> Scan Face
                  </button>
                </div>
                <p className="qr-hint">📸 Click "Scan Face" to register patient's face</p>
              </div>
            </div>
          )}

          {/* ─── STEP 4: FACE SCAN ─── */}
          {step === 4 && (
            <div className="face-scan-section">
              <div className="face-scan-card">
                <h3><i className="fas fa-face-smile"></i> Scan Patient's Face</h3>
                <p>Position the patient's face in the camera</p>

                <div className="camera-container">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="camera-video"
                    videoConstraints={{ width: 400, height: 300, facingMode: 'user' }}
                    onUserMedia={() => {
                      console.log('📷 Camera started');
                      setTimeout(() => {
                        if (webcamRef.current && webcamRef.current.video) {
                          const video = webcamRef.current.video;
                          if (video.readyState === 4 && video.videoWidth > 0) {
                            startFaceDetection();
                          }
                        }
                      }, 1000);
                    }}
                    onUserMediaError={(err) => {
                      console.error('❌ Camera error:', err);
                      setError('Camera error: ' + err.message);
                    }}
                  />
                  <canvas ref={canvasRef} className="camera-canvas" />
                </div>

                <div className="camera-status">
                  {!modelsLoaded ? <div className="status-warning">Loading face models...</div> :
                   isDetecting ? <div className="status-warning">Detecting face...</div> :
                   faceDetected ? <div className="status-success">✅ Face Detected!</div> :
                   <div className="status-warning">Looking for face...</div>}
                </div>

                {capturedFaceImage && (
                  <div className="face-preview-container">
                    <img src={capturedFaceImage} alt="Captured face" className="face-preview-img" />
                    <span className="face-preview-label">✅ Face Captured</span>
                  </div>
                )}

                <div className="face-scan-actions">
                  {faceDetected && !isFaceVerified ? (
                    <button className="btn-register-face" onClick={registerFace} disabled={loading || isRegisteringFace}>
                      {isRegisteringFace ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Register Face
                    </button>
                  ) : isFaceVerified ? (
                    <button className="btn-success-verified" disabled>
                      <i className="fas fa-check-circle"></i> Face Registered ✓
                    </button>
                  ) : (
                    <button className="btn-capture-face" disabled>
                      <i className="fas fa-spinner fa-spin"></i> Waiting for face...
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 5: COMPLETE ─── */}
          {step === 5 && registrationComplete && (
            <div className="complete-section">
              <div className="complete-card">
                <div className="complete-icon">
                  <i className="fas fa-check-circle" style={{ color: '#10B981', fontSize: '5rem' }}></i>
                </div>
                <h2>✅ Registration Complete!</h2>
                <p><strong>Patient:</strong> {formData.first_name} {formData.last_name}</p>
                <p><strong>ID Number:</strong> {formData.id_number}</p>
                <p><strong>DOB:</strong> {formData.date_of_birth}</p>
                <p><strong>Gender:</strong> {formData.gender}</p>
                <p><strong>QR Code:</strong> Generated ✓</p>
                <p><strong>Face:</strong> {isFaceVerified ? 'Registered ✓' : 'Skipped'}</p>
                <button className="btn-dashboard" onClick={() => window.location.href = '/dashboard'}>
                  <i className="fas fa-arrow-right"></i> Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientRegistration;