// backend/test-email.js
const nodemailer = require('nodemailer');

console.log('Nodemailer loaded:', typeof nodemailer);
console.log('Nodemailer methods:', Object.keys(nodemailer));

// Try to create transporter
try {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'test@gmail.com',
            pass: 'test'
        }
    });
    console.log('✅ Transporter created successfully');
} catch (error) {
    console.error('❌ Error:', error.message);
}