// backend/test-email-send.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
    console.log('📧 Testing email send...');
    console.log('Email user:', process.env.EMAIL_USER);
    console.log('Email pass exists:', !!process.env.EMAIL_PASS);
    
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER || 'pulselogic.system@gmail.com',
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.verify();
        console.log('✅ Transporter verified successfully');
        
        // Send test email
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.EMAIL_USER || 'pulselogic.system@gmail.com'}>`,
            to: 'your-email@gmail.com', // Replace with your email
            subject: 'Test Email from PulseLogic',
            text: 'This is a test email from PulseLogic system.',
            html: '<h1>Test Email</h1><p>This is a test email from PulseLogic system.</p>'
        });
        
        console.log('✅ Email sent:', info.messageId);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

testEmail();