const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cors = require('cors');
const compression = require('compression');

// --- Configuration ---
let PORT = process.env.PORT || 80;
const DATA_FILE = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(__dirname, 'dist');
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SERVER_ADMIN_CODE = Math.floor(100000 + Math.random() * 900000).toString();

// Track currently active socket connections for the admin panel
const activeUsers = new Map(); // socket.id -> { deviceId, ip }

// --- Ensure Directories Exist ---
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ messages: [] }));

// --- Setup Server ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(compression());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR, {
    maxAge: '1d' // Cache uploads for 1 day
}));

// Serve React frontend with aggressive caching for hashed assets
app.use(express.static(DIST_DIR, {
    setHeaders: (res, path) => {
        if (path.includes('/assets/')) {
            // Cache static assets (JS/CSS/images) for 1 year
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
            // For index.html and others, ask browser to check for updates
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// --- Database Helpers ---
function loadDatabase() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const db = JSON.parse(data);
        if (!db.permissions) db.permissions = { admins: [], editors: [], conversers: [], blocked: [] };
        if (!db.permissions.conversers) db.permissions.conversers = [];
        return db;
    } catch (err) {
        console.error("Error loading database:", err);
        return { messages: [], permissions: { admins: [], editors: [], conversers: [], blocked: [] } };
    }
}

function saveDatabase(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error saving database:", err);
    }
}

// --- Multer Utils ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- API Routes ---

// Join a room (get history and role)
app.post('/api/room/join', (req, res) => {
    const { roomCode, deviceId } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'Room code required' });

    const db = loadDatabase();
    
    let role = 'viewer';
    if (deviceId) {
        role = getRoleForDevice(db, deviceId);
    }

    const messages = db.messages.filter(m => m.roomCode === roomCode);
    
    // Construct the LAN URL to help clients generate correct QR codes
    const ip = getLocalIP();
    const displayPort = PORT === 80 ? "" : `:${PORT}`;
    const serverUrl = `http://${ip}${displayPort}`;

    res.json({ success: true, messages, role, serverUrl });
});

// Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Construct local URL (relative to server root)
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        fileUrl: fileUrl,
        publicId: req.file.filename // Using filename as ID for local deletion
    });
});

// Send Message
app.post('/api/message', (req, res) => {
    const { roomCode, type, content, fileUrl, publicId, deviceId } = req.body;
    
    const db = loadDatabase();
    
    if (deviceId) {
        const role = getRoleForDevice(db, deviceId);
        if (role === 'blocked') return res.status(403).json({ error: 'Blocked' });
        if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot send messages' });
    }

    const newMessage = {
        _id: Date.now().toString(), // Simple ID
        roomCode,
        type,
        content,
        fileUrl,
        publicId,
        uploaderId: deviceId,
        createdAt: new Date().toISOString()
    };
    
    db.messages.push(newMessage);
    saveDatabase(db);
    
    io.to(roomCode).emit('receive_message', newMessage);
    res.json({ success: true, message: newMessage });
});

// Delete Message
app.delete('/api/message/:id', (req, res) => {
    const { id } = req.params;
    const deviceId = req.headers.deviceid;
    const db = loadDatabase();
    
    const msgIndex = db.messages.findIndex(m => m._id === id);
    if (msgIndex === -1) return res.status(404).json({ error: 'Message not found' });
    
    const message = db.messages[msgIndex];

    // Auth Check: STRICTLY Admin or Editor only
    const isAdmin = db.permissions.admins.includes(deviceId);
    const isEditor = db.permissions.editors.includes(deviceId);
    
    if (!isAdmin && !isEditor) {
        return res.status(403).json({ error: 'Forbidden. You do not have Delete permissions.' });
    }
    
    // Delete file if exists
    if (message.type === 'file' && message.publicId) {
        const filePath = path.join(UPLOADS_DIR, message.publicId);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    // Remove from DB
    db.messages.splice(msgIndex, 1);
    saveDatabase(db);
    
    io.to(message.roomCode).emit('delete_message', id);
    res.json({ success: true, messageId: id });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { adminCode, deviceId } = req.body;
    if (!adminCode || !deviceId) return res.status(400).json({ error: 'Missing data' });
    
    if (adminCode === SERVER_ADMIN_CODE) {
        const db = loadDatabase();
        if (!db.permissions.admins.includes(deviceId)) {
            db.permissions.admins.push(deviceId);
            saveDatabase(db);
            // Remove from other roles if present
            db.permissions.editors = db.permissions.editors.filter(id => id !== deviceId);
            db.permissions.blocked = db.permissions.blocked.filter(id => id !== deviceId);
            saveDatabase(db);
        }
        res.json({ success: true, role: 'admin' });
    } else {
        res.status(401).json({ error: 'Invalid code' });
    }
});

// Admin Role Management
app.post('/api/admin/role', (req, res) => {
    const { targetId, action } = req.body; // action: 'editor', 'converser', 'block', 'reset'
    const adminId = req.headers.deviceid;
    const db = loadDatabase();
    
    if (!db.permissions.admins.includes(adminId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (db.permissions.admins.includes(targetId)) {
        return res.status(400).json({ error: 'Cannot modify another admin' });
    }

    // Clean current roles for target
    db.permissions.editors = db.permissions.editors.filter(id => id !== targetId);
    db.permissions.conversers = db.permissions.conversers.filter(id => id !== targetId);
    db.permissions.blocked = db.permissions.blocked.filter(id => id !== targetId);

    if (action === 'editor') db.permissions.editors.push(targetId);
    if (action === 'converser') db.permissions.conversers.push(targetId);
    if (action === 'block') db.permissions.blocked.push(targetId);
    
    saveDatabase(db);

    // If blocked, forcefully disconnect their active sockets
    if (action === 'block') {
        for (const [socketId, user] of activeUsers.entries()) {
            if (user.deviceId === targetId) {
                const targetSocket = io.sockets.sockets.get(socketId);
                if (targetSocket) {
                    targetSocket.emit('access_denied', { reason: 'blocked' });
                    targetSocket.disconnect(true);
                }
            }
        }
    }

    // Broadcast update to admins
    broadcastActiveUsers();
    io.to('admin_channel').emit('blocked_users_update', db.permissions.blocked);
    
    // Broadcast role update to all so the target client refreshes UI
    io.emit('role_update', { targetId, action });

    res.json({ success: true });
});

// Get Blocked Users List
app.get('/api/admin/blocked', (req, res) => {
    const adminId = req.headers.deviceid;
    const db = loadDatabase();
    if (!db.permissions.admins.includes(adminId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ success: true, blocked: db.permissions.blocked });
});

// Fallback for React Router (handled by serving index.html for unknown routes)
app.get('*', (req, res) => {
    // Check if the request is for a file that exists in dist (avoid sending index.html for missing js/css)
    const filePath = path.join(DIST_DIR, req.path);
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
});

// --- Socket.io ---
function getRoleForDevice(db, deviceId) {
    if (db.permissions.blocked.includes(deviceId)) return 'blocked';
    if (db.permissions.admins.includes(deviceId)) return 'admin';
    if (db.permissions.editors.includes(deviceId)) return 'editor';
    if (db.permissions.conversers.includes(deviceId)) return 'converser';
    return 'viewer';
}

function broadcastActiveUsers() {
    const db = loadDatabase();
    // Map existing activeUsers to include their current role
    const usersWithRoles = Array.from(activeUsers.values()).map(user => ({
        ...user,
        role: getRoleForDevice(db, user.deviceId)
    }));
    io.to('admin_channel').emit('active_users_update', usersWithRoles);
}

io.on('connection', (socket) => {
    const ip = socket.handshake.address;
    
    socket.on('join_room', (data) => {
        // Handle backwards compatibility (if string) or new object logic
        const roomCode = typeof data === 'string' ? data : data.roomCode;
        const deviceId = typeof data === 'object' ? data.deviceId : null;

        if (deviceId) {
            const db = loadDatabase();
            if (db.permissions.blocked.includes(deviceId)) {
                socket.emit('access_denied', { reason: 'blocked' });
                socket.disconnect(true);
                return;
            }
            activeUsers.set(socket.id, { deviceId, ip });
            broadcastActiveUsers();
        }

        socket.join(roomCode);
        console.log(`User ${deviceId || socket.id} joined room ${roomCode}`);
    });

    socket.on('join_admin_channel', (deviceId) => {
        const db = loadDatabase();
        if (db.permissions.admins.includes(deviceId)) {
            socket.join('admin_channel');
            broadcastActiveUsers();
            socket.emit('blocked_users_update', db.permissions.blocked);
        }
    });
    
    socket.on('disconnect', () => {
        activeUsers.delete(socket.id);
        broadcastActiveUsers();
    });
});

// --- Cleanup Task ---
setInterval(() => {
    console.log("Running cleanup...");
    const db = loadDatabase();
    const now = Date.now();
    
    const validMessages = [];
    let deletedCount = 0;
    
    db.messages.forEach(msg => {
        const created = new Date(msg.createdAt).getTime();
        if (now - created > EXPIRATION_MS) {
            // Delete file
            if (msg.type === 'file' && msg.publicId) {
                const filePath = path.join(UPLOADS_DIR, msg.publicId);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (e) {
                        console.error("Failed to delete file:", filePath);
                    }
                }
            }
            deletedCount++;
        } else {
            validMessages.push(msg);
        }
    });
    
    if (deletedCount > 0) {
        db.messages = validMessages;
        saveDatabase(db);
        console.log(`Cleanup: Removed ${deletedCount} messages.`);
    }
}, CLEANUP_INTERVAL_MS);


// --- Manual Drops Sync & Watcher ---
function syncManualDrops() {
    const db = loadDatabase();
    if (!fs.existsSync(UPLOADS_DIR)) return;
    
    const diskFiles = fs.readdirSync(UPLOADS_DIR);
    let changed = false;

    // 1. Check for files on disk not in DB
    diskFiles.forEach(file => {
        const filePath = path.join(UPLOADS_DIR, file);
        if (fs.statSync(filePath).isDirectory()) return;

        const exists = db.messages.some(m => m.type === 'file' && m.publicId === file);
        if (!exists) {
            db.messages.push({
                _id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                roomCode: 'LOBBY',
                type: 'file',
                content: file,
                fileUrl: `/uploads/${file}`,
                publicId: file,
                createdAt: new Date().toISOString()
            });
            changed = true;
            console.log(`Startup Sync: Added missing file ${file}`);
        }
    });

    // 2. Check for DB entries whose files are missing from disk
    db.messages = db.messages.filter(m => {
        if (m.type !== 'file') return true;
        const exists = diskFiles.includes(m.publicId);
        if (!exists) {
            console.log(`Startup Sync: Removed ghost entry for ${m.publicId}`);
            changed = true;
        }
        return exists;
    });

    if (changed) {
        saveDatabase(db);
        // We don't emit here because clients haven't connected yet (or will fetch on connect)
    }
}

let watchTimeout = null;
let changedFiles = new Set();

fs.watch(UPLOADS_DIR, (eventType, filename) => {
    if (!filename) return;
    changedFiles.add(filename);

    if (watchTimeout) clearTimeout(watchTimeout);
    watchTimeout = setTimeout(() => {
        const db = loadDatabase();
        const filesToProcess = Array.from(changedFiles);
        changedFiles.clear();

        filesToProcess.forEach(file => {
            const filePath = path.join(UPLOADS_DIR, file);
            fs.access(filePath, fs.constants.F_OK, (err) => {
                const dbLatest = loadDatabase(); // Reload to get other changes if any
                if (err) {
                    // Deleted
                    const msgIndex = dbLatest.messages.findIndex(m => m.type === 'file' && m.publicId === file);
                    if (msgIndex !== -1) {
                        const deletedMsg = dbLatest.messages[msgIndex];
                        dbLatest.messages.splice(msgIndex, 1);
                        saveDatabase(dbLatest);
                        io.to(deletedMsg.roomCode).emit('delete_message', deletedMsg._id);
                        console.log(`Manual Drop: Detected removal of ${file}`);
                    }
                } else {
                    // Added/Modified
                    const exists = dbLatest.messages.some(m => m.type === 'file' && m.publicId === file);
                    if (!exists) {
                        const newMessage = {
                            _id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                            roomCode: 'LOBBY',
                            type: 'file',
                            content: file,
                            fileUrl: `/uploads/${file}`,
                            publicId: file,
                            createdAt: new Date().toISOString()
                        };
                        dbLatest.messages.push(newMessage);
                        saveDatabase(dbLatest);
                        io.to('LOBBY').emit('receive_message', newMessage);
                        console.log(`Manual Drop: Registered ${file} in LOBBY room`);
                    }
                }
            });
        });
    }, 500);
});



function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function startServer(portToTry) {
    const requestedPort = portToTry;
    server.listen(portToTry, '0.0.0.0', () => {
        syncManualDrops();
        const actualPort = server.address().port;
        const ip = getLocalIP();
        const hostname = os.hostname().toLowerCase() + ".local";
        const displayPort = actualPort === 80 ? "" : `:${actualPort}`;
        
        console.log(`
    ======================================
    🚀 DeadDrop Offline Server Running!
    ======================================
    📂 Local Storage: ${UPLOADS_DIR}
    🌐 LAN Access:    http://${ip}${displayPort}
    🏷️  Hostname:     http://${hostname}${displayPort}
    --------------------------------------
    🛡️  [ADMIN KEY]   ${SERVER_ADMIN_CODE}
    ======================================
    Final Port: ${actualPort} (Requested: ${requestedPort})
    --------------------------------------
    `);
    }).on('error', (err) => {
        if ((err.code === 'EACCES' || err.code === 'EADDRINUSE') && portToTry === 80 && !process.env.PORT) {
            console.log(`Port 80 is ${err.code === 'EACCES' ? 'restricted' : 'in use'}. Trying fallback Port 3001...`);
            PORT = 3001;
            startServer(3001);
        } else if (err.code === 'EADDRINUSE' && portToTry !== 0) {
            console.log(`Port ${portToTry} is in use. Final fallback to any available port...`);
            PORT = 0;
            startServer(0);
        } else {
            console.error("Server Error:", err);
            process.exit(1);
        }
    });
}

startServer(PORT);
