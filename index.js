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
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(__dirname, 'dist');
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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

// --- Static Files ---
// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));
// Serve React frontend
app.use(express.static(DIST_DIR));

// --- Database Helpers ---
function loadDatabase() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error loading database:", err);
        return { messages: [] };
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

// Join a room (get history)
app.post('/api/room/join', (req, res) => {
    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'Room code required' });

    const db = loadDatabase();
    const messages = db.messages.filter(m => m.roomCode === roomCode);
    res.json({ success: true, messages });
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
    const { roomCode, type, content, fileUrl, publicId } = req.body;
    
    const db = loadDatabase();
    const newMessage = {
        _id: Date.now().toString(), // Simple ID
        roomCode,
        type,
        content,
        fileUrl,
        publicId,
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
    const db = loadDatabase();
    
    const msgIndex = db.messages.findIndex(m => m._id === id);
    if (msgIndex === -1) return res.status(404).json({ error: 'Message not found' });
    
    const message = db.messages[msgIndex];
    
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
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room ${roomCode}`);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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


// --- Start Server & Detect IP ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`
    🚀 DeadDrop Offline Server Running!
    -----------------------------------
    📂 Local Storage: ${UPLOADS_DIR}
    🌐 LAN Access:    http://${ip}:${PORT}
    -----------------------------------
    `);
});
