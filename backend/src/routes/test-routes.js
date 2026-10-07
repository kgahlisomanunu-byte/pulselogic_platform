// backend/test-routes.js
/**
 * Test script to verify all route files are loading correctly
 * Run with: node test-routes.js
 */

console.log('🧪 ========================================');
console.log('🧪 Testing Route Imports');
console.log('🧪 ========================================\n');

try {
    // ─── TEST AUTH ROUTES ───
    console.log('📂 Loading auth.js...');
    const auth = require('./routes/auth');
    console.log('✅ auth.js loaded successfully');
    
    console.log('   Available auth routes:');
    const authRoutes = [];
    auth.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            authRoutes.push(`   ${methods} /api/auth${layer.route.path}`);
        }
    });
    authRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${authRoutes.length} routes\n`);

    // ─── TEST USERS ROUTES ───
    console.log('📂 Loading users.js...');
    const users = require('./routes/users');
    console.log('✅ users.js loaded successfully');
    
    console.log('   Available user routes:');
    const userRoutes = [];
    users.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            userRoutes.push(`   ${methods} /api/users${layer.route.path}`);
        }
    });
    userRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${userRoutes.length} routes\n`);

    // ─── TEST PATIENTS ROUTES ───
    console.log('📂 Loading patients.js...');
    const patients = require('./routes/patients');
    console.log('✅ patients.js loaded successfully');
    
    console.log('   Available patient routes:');
    const patientRoutes = [];
    patients.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            patientRoutes.push(`   ${methods} /api/patients${layer.route.path}`);
        }
    });
    patientRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${patientRoutes.length} routes\n`);

    // ─── TEST QUEUE ROUTES ───
    console.log('📂 Loading queue.js...');
    const queue = require('./routes/queue');
    console.log('✅ queue.js loaded successfully');
    
    console.log('   Available queue routes:');
    const queueRoutes = [];
    queue.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            queueRoutes.push(`   ${methods} /api/queue${layer.route.path}`);
        }
    });
    queueRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${queueRoutes.length} routes\n`);

    // ─── TEST VISITS ROUTES ───
    console.log('📂 Loading visits.js...');
    const visits = require('./routes/visits');
    console.log('✅ visits.js loaded successfully');
    
    console.log('   Available visit routes:');
    const visitRoutes = [];
    visits.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            visitRoutes.push(`   ${methods} /api/visits${layer.route.path}`);
        }
    });
    visitRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${visitRoutes.length} routes\n`);

    // ─── TEST DASHBOARD ROUTES ───
    console.log('📂 Loading dashboard.js...');
    const dashboard = require('./routes/dashboard');
    console.log('✅ dashboard.js loaded successfully');
    
    console.log('   Available dashboard routes:');
    const dashboardRoutes = [];
    dashboard.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            dashboardRoutes.push(`   ${methods} /api/dashboard${layer.route.path}`);
        }
    });
    dashboardRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${dashboardRoutes.length} routes\n`);

    // ─── TEST ORGANIZATION ROUTES ───
    console.log('📂 Loading organization.js...');
    const organization = require('./routes/organization');
    console.log('✅ organization.js loaded successfully');
    
    console.log('   Available organization routes:');
    const orgRoutes = [];
    organization.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            orgRoutes.push(`   ${methods} /api/organizations${layer.route.path}`);
        }
    });
    orgRoutes.sort().forEach(route => console.log(route));
    console.log(`   Total: ${orgRoutes.length} routes\n`);

    // ─── SUMMARY ───
    console.log('✅ ========================================');
    console.log('✅ ALL ROUTES LOADED SUCCESSFULLY!');
    console.log('✅ ========================================');
    
    const totalRoutes = authRoutes.length + userRoutes.length + patientRoutes.length + 
                        queueRoutes.length + visitRoutes.length + dashboardRoutes.length + 
                        orgRoutes.length;
    
    console.log(`\n📊 Total Routes: ${totalRoutes}`);
    console.log(`   - Auth: ${authRoutes.length}`);
    console.log(`   - Users: ${userRoutes.length}`);
    console.log(`   - Patients: ${patientRoutes.length}`);
    console.log(`   - Queue: ${queueRoutes.length}`);
    console.log(`   - Visits: ${visitRoutes.length}`);
    console.log(`   - Dashboard: ${dashboardRoutes.length}`);
    console.log(`   - Organizations: ${orgRoutes.length}`);

    console.log('\n🚀 To test the server, run: npm start');
    console.log('📋 Then visit: http://localhost:5000/api/auth/routes');
    console.log('📋 Or test: http://localhost:5000/api/health\n');

} catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR LOADING ROUTES');
    console.error('❌ ========================================');
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.stack) {
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
    }
    
    console.error('\n💡 Possible solutions:');
    console.error('   1. Check if the file exists in the routes folder');
    console.error('   2. Check for syntax errors in the route file');
    console.error('   3. Make sure all dependencies are installed');
    console.error('   4. Check if the path in require() is correct');
    
    process.exit(1);
}