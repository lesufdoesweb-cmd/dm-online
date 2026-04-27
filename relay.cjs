const http = require('http');
const Gun = require('gun');

const port = 8765;

const server = http.createServer((req, res) => {
    if (Gun.serve(req, res)) return; // Handle Gun internal requests
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Gun Relay Running\n');
});

// Explicitly handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Kill the existing process or use a different port.`);
    }
});

const gun = Gun({ 
    web: server,
    localStorage: false, // Disable localStorage on server to use Radisk
    radisk: true
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Gun relay server is running at http://0.0.0.0:${port}/gun`);
});

// Catch uncaught exceptions to prevent PM2 crash loops
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
