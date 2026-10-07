// src/components/FaceVerification/FaceVerification.jsx
import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../styles/FaceVerification.css';

const FaceVerification = ({ email, mode = 'verify', onSuccess, onError }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('📷 Starting camera...');
    const [faceDetected, setFaceDetected] = useState(false);
    const [matchConfidence, setMatchConfidence] = useState(0);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState(null);
    const [debug, setDebug] = useState('Initializing...');
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            await loadModels();
            await startCamera();
        };
        init();

        return () => {
            stopCamera();
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    const loadModels = async () => {
        try {
            setDebug('📥 Loading models...');
            setStatus('📥 Loading face models...');
            
            const MODEL_URL = '/models';
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            
            setModelsLoaded(true);
            setStatus('✅ Models ready!');
            setDebug('✅ Models loaded');
        } catch (error) {
            console.error('❌ Model load error:', error);
            setDebug(`❌ Error: ${error.message}`);
            setStatus('❌ Failed to load models');
        }
    };

    const startCamera = async () => {
        try {
            setDebug('📷 Starting camera...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setStatus('👤 Looking for face...');
                setDebug('✅ Camera started');
                
                detectionIntervalRef.current = setInterval(detectFace, 200);
            }
        } catch (error) {
            console.error('❌ Camera error:', error);
            setDebug(`❌ Camera: ${error.message}`);
            setStatus('⚠️ Camera access denied');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
    };

    const detectFace = async () => {
        if (!videoRef.current || !modelsLoaded) return;
        if (videoRef.current.paused || videoRef.current.readyState !== 4) return;

        try {
            const detection = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ 
                    inputSize: 224,
                    scoreThreshold: 0.5
                })
            ).withFaceLandmarks().withFaceDescriptor();

            if (canvasRef.current) {
                const displaySize = { width: 640, height: 480 };
                faceapi.matchDimensions(canvasRef.current, displaySize);
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (detection) {
                    const descriptor = Array.from(detection.descriptor);
                    setFaceDescriptor(descriptor);
                    setFaceDetected(true);
                    setStatus(`✅ Face detected! (${descriptor.length} points)`);
                    setDebug(`✅ Face found!`);
                    
                    console.log('✅ Face detected! Descriptor length:', descriptor.length);
                    
                    const resized = faceapi.resizeResults(detection, displaySize);
                    faceapi.draw.drawDetections(canvasRef.current, resized);
                    faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
                } else {
                    setFaceDetected(false);
                    if (status === '✅ Face detected! (128 points)') {
                        setStatus('👤 Looking for face...');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Detection error:', error);
        }
    };

    // ─── REGISTER FACE ───
    const handleRegisterFace = async () => {
        console.log('🔍 ===== REGISTER BUTTON CLICKED =====');
        console.log('🔍 Email:', email);
        console.log('🔍 faceDescriptor:', faceDescriptor);
        console.log('🔍 faceDescriptor type:', typeof faceDescriptor);
        console.log('🔍 faceDescriptor is array:', Array.isArray(faceDescriptor));
        
        if (faceDescriptor) {
            console.log('🔍 faceDescriptor length:', faceDescriptor.length);
            console.log('🔍 First 5 values:', faceDescriptor.slice(0, 5));
        } else {
            console.log('🔍 faceDescriptor is null or undefined');
        }

        if (!email) {
            setStatus('❌ Email required');
            setDebug('❌ No email');
            return;
        }

        if (!faceDescriptor) {
            setStatus('❌ No face detected. Click "Scan Face" first.');
            setDebug('❌ No face data');
            return;
        }

        if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
            setStatus('❌ Invalid face data');
            setDebug('❌ Invalid face data');
            return;
        }

        setLoading(true);
        setStatus('📸 Registering...');
        setDebug('📤 Sending...');

        try {
            // Clean the descriptor - ensure all values are numbers
            const cleanedDescriptor = faceDescriptor
                .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
                .map(v => parseFloat(v.toFixed(6)));
            
            if (cleanedDescriptor.length === 0) {
                setStatus('❌ Invalid face data');
                setDebug('❌ No valid numbers');
                setLoading(false);
                return;
            }
            
            console.log('📤 ===== SENDING REGISTER REQUEST =====');
            console.log('📤 Email:', email);
            console.log('📤 Cleaned descriptor length:', cleanedDescriptor.length);
            console.log('📤 First 5 values:', cleanedDescriptor.slice(0, 5));
            console.log('📤 Descriptor type:', typeof cleanedDescriptor);
            console.log('📤 Is array:', Array.isArray(cleanedDescriptor));
            
            const payload = {
                email: email.trim(),
                faceDescriptor: cleanedDescriptor
            };
            
            console.log('📤 Payload keys:', Object.keys(payload));
            console.log('📤 Payload descriptor length:', payload.faceDescriptor.length);
            
            const response = await axios.post('/api/auth/register-face', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response data:', response.data);
            setDebug(`📥 ${response.data.message}`);

            if (response.data.success) {
                setStatus('✅ Registered! 🎉');
                setMatchConfidence(100);
                setDebug('✅ Success!');
                
                if (response.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
                if (onSuccess) onSuccess(response.data.user);
                setTimeout(() => navigate('/dashboard'), 1500);
            } else {
                setStatus('❌ ' + response.data.message);
                setDebug(`❌ ${response.data.message}`);
                if (onError) onError(response.data.message);
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            const msg = error.response?.data?.message || error.message;
            setStatus('❌ Failed: ' + msg);
            setDebug(`❌ ${msg}`);
            if (onError) onError(msg);
        } finally {
            setLoading(false);
        }
    };

    // ─── VERIFY FACE ───
    const handleVerifyFace = async () => {
        console.log('🔍 ===== VERIFY BUTTON CLICKED =====');
        console.log('🔍 faceDescriptor:', faceDescriptor);
        console.log('🔍 faceDescriptor type:', typeof faceDescriptor);
        console.log('🔍 faceDescriptor is array:', Array.isArray(faceDescriptor));
        
        if (faceDescriptor) {
            console.log('🔍 faceDescriptor length:', faceDescriptor.length);
        }

        if (!faceDescriptor) {
            setStatus('❌ No face detected. Click "Scan Face" first.');
            setDebug('❌ No face data');
            return;
        }

        if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
            setStatus('❌ Invalid face data');
            setDebug('❌ Invalid face data');
            return;
        }

        setLoading(true);
        setStatus('🔍 Verifying...');
        setDebug('🔍 Sending...');

        try {
            const cleanedDescriptor = faceDescriptor
                .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
                .map(v => parseFloat(v.toFixed(6)));
            
            console.log('🔐 ===== SENDING VERIFY REQUEST =====');
            console.log('🔐 Cleaned descriptor length:', cleanedDescriptor.length);
            
            const response = await axios.post('/api/auth/face-verify', {
                faceDescriptor: cleanedDescriptor
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('📥 Response:', response.data);
            setDebug(`📥 ${response.data.message}`);

            if (response.data.success) {
                const confidence = response.data.matchConfidence || 0;
                setMatchConfidence(confidence);
                setStatus(`✅ Verified! ${confidence}%`);
                setDebug(`✅ ${confidence}% match`);
                
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                if (response.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
                
                if (onSuccess) onSuccess(response.data.user);
                setTimeout(() => navigate(response.data.redirectUrl || '/dashboard'), 1000);
            } else {
                setStatus('❌ ' + response.data.message);
                setDebug(`❌ ${response.data.message}`);
                if (onError) onError(response.data.message);
            }
        } catch (error) {
            console.error('❌ Verification error:', error);
            const msg = error.response?.data?.message || error.message;
            setStatus('❌ Failed: ' + msg);
            setDebug(`❌ ${msg}`);
            if (onError) onError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStatus('🔄 Reset');
        setMatchConfidence(0);
        setFaceDetected(false);
        setFaceDescriptor(null);
        setDebug('🔄 Reset');
        
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setTimeout(() => setStatus('👤 Looking...'), 500);
    };

    const triggerScan = async () => {
        setDebug('🔍 Scanning...');
        await detectFace();
        if (faceDescriptor) {
            setDebug(`✅ Captured ${faceDescriptor.length} points`);
        } else {
            setDebug('❌ No face detected');
        }
    };

    return (
        <div className="face-verification-container">
            <div className="face-verification-header">
                <h2 className="face-verification-title">
                    {mode === 'register' ? '📸 Face Registration' : '🔐 Face Verification'}
                </h2>
                {email && <p className="face-verification-email">User: {email}</p>}
                <p className="face-verification-debug">🔍 {debug}</p>
                <p style={{ fontSize: '11px', color: '#999' }}>
                    Models: {modelsLoaded ? '✅' : '⏳'} | Face: {faceDetected ? '✅' : '⏳'} | 
                    Descriptor: {faceDescriptor ? `✅ ${faceDescriptor.length}` : '⏳'}
                </p>
            </div>
            
            <div className="video-wrapper">
                <video ref={videoRef} className="video-feed" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="video-canvas" width={640} height={480} />
                {!modelsLoaded && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>Loading models...</p>
                    </div>
                )}
            </div>

            <div className="status-container">
                <div className={`status-message ${faceDetected ? 'status-success' : 'status-warning'}`}>
                    {status}
                </div>

                {matchConfidence > 0 && (
                    <div className="confidence-container">
                        <span>Match:</span>
                        <strong>{matchConfidence}%</strong>
                        <div className="confidence-bar">
                            <div className="confidence-fill" style={{ 
                                width: `${matchConfidence}%`,
                                background: matchConfidence > 70 ? '#28a745' : 
                                           matchConfidence > 40 ? '#ffc107' : '#dc3545'
                            }} />
                        </div>
                    </div>
                )}

                {faceDescriptor && (
                    <div className="descriptor-info">
                        <span>✅ {faceDescriptor.length} data points</span>
                        <small>First: {faceDescriptor.slice(0, 3).map(v => v.toFixed(2)).join(', ')}</small>
                    </div>
                )}

                <div className="button-group">
                    <button
                        onClick={triggerScan}
                        disabled={loading || !modelsLoaded}
                        className="btn btn-capture"
                        style={{ background: '#17a2b8' }}
                    >
                        🔍 Scan Face
                    </button>

                    {mode === 'register' ? (
                        <button
                            onClick={handleRegisterFace}
                            disabled={loading || !faceDescriptor || !modelsLoaded}
                            className="btn btn-register"
                        >
                            {loading ? '⏳...' : '📝 Register'}
                        </button>
                    ) : (
                        <button
                            onClick={handleVerifyFace}
                            disabled={loading || !faceDescriptor || !modelsLoaded}
                            className="btn btn-verify"
                        >
                            {loading ? '⏳...' : '🔐 Verify'}
                        </button>
                    )}
                    
                    <button onClick={handleReset} className="btn btn-reset" disabled={loading}>
                        🔄 Reset
                    </button>
                </div>

                <div className="helper-text">
                    {!modelsLoaded ? '⏳ Loading models...' :
                     !faceDetected ? '👤 Click "Scan Face" to detect your face' :
                     mode === 'register' ? '✅ Face detected! Click "Register" to save' : 
                     '✅ Face detected! Click "Verify" to check'}
                </div>

                {faceDetected && (
                    <div className="landmarks-info">
                        <p>📍 Face detected with 68 landmarks</p>
                        <div className="landmarks-dots-preview">
                            {[...Array(11)].map((_, i) => (
                                <span key={i} className="dot" style={{
                                    color: i < 3 ? '#6c757d' : i < 6 ? '#534AB7' : i < 9 ? '#28a745' : '#6c757d'
                                }}>●</span>
                            ))}
                        </div>
                        <small>68 facial landmarks being tracked</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceVerification;