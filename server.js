const express = require('express');
const app = express();
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get pod/system info
app.get('/api/info', (req, res) => {
    res.json({
        podName: process.env.POD_NAME || os.hostname(),
        nodeName: process.env.NODE_NAME || 'local-machine',
        namespace: process.env.NAMESPACE || 'development',
        podIP: process.env.POD_IP || '127.0.0.1',
        platform: os.platform(),
        architecture: os.arch(),
        uptime: os.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
