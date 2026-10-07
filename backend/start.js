const { exec } = require('child_process');
const portfinder = require('portfinder');
const fs = require('fs');
const path = require('path');

async function findAvailablePort() {
    try {
        const port = await portfinder.getPortPromise({
            port: 5000,
            stopPort: 5010
        });
        return port;
    } catch (error) {
        console.error('❌ Error finding port:', error);
        return 5000;
    }
}

async function start() {
    const port = await findAvailablePort();
    
    // Write the port to a .port file for frontend to read
    fs.writeFileSync(path.join(__dirname, '.port'), port.toString());
    
    console.log(`🚀 Starting server on port ${port}...`);
    
    // Set environment variable and start the server
    const env = { ...process.env, PORT: port };
    const child = exec('node src/server.js', { env });
    
    child.stdout.on('data', (data) => {
        console.log(data);
    });
    
    child.stderr.on('data', (data) => {
        console.error(data);
    });
}

start();