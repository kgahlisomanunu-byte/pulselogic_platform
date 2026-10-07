const bcrypt = require('bcryptjs');
const { db } = require('../config/db');

async function hashExistingPasswords() {
    try {
        console.log('🔐 Starting password hashing...');
        
        // Get all users with plain text passwords
        const [users] = await db.query(
            'SELECT user_id, email, password_hash FROM users WHERE password_hash NOT LIKE "$2a$%" AND password_hash NOT LIKE "$2b$%"'
        );
        
        if (users.length === 0) {
            console.log('✅ No plain text passwords found. All passwords are already hashed!');
            return;
        }
        
        console.log(`📝 Found ${users.length} users with plain text passwords`);
        
        // Hash each password
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password_hash, 10);
            
            await db.query(
                'UPDATE users SET password_hash = ? WHERE user_id = ?',
                [hashedPassword, user.user_id]
            );
            
            console.log(`✅ Hashed password for: ${user.email}`);
        }
        
        console.log('🎉 All passwords have been hashed successfully!');
        
    } catch (error) {
        console.error('❌ Error hashing passwords:', error);
    } finally {
        process.exit(0);
    }
}

hashExistingPasswords();