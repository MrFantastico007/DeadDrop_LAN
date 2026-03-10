# ⚡ DeadDrop (Offline LAN Version)

> **Real-time. Ephemeral. Portable.**  
> A 100% offline, standalone file-sharing application designed to run from a USB drive on any Local Area Network (LAN).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-Node.js%20|%20React-green.svg)
![Status](https://img.shields.io/badge/status-Portable-brightgreen.svg)

---

# 📖 About

**DeadDrop Offline** is a zero-install, zero-cloud file sharing tool. It solves the problem of getting a file from a locked-down work/school PC to your phone, or sharing files locally with a group, without needing internet access, cloud storage, or Bluetooth.

You just plug in your USB drive, double-click the starter script, and anyone on the same Wi-Fi/LAN can instantly access the drop zone via your IP address.

---

# ✨ Key Features

### 🔌 100% Offline / USB Portable
No internet, MongoDB, or Cloudinary required. Everything runs locally on the host machine.

### ⚡ Zero-Install for Clients
Users just scan a QR code or type an IP address in their browser. No apps to download.

### 📂 Local Storage
Files are saved directly to an `./uploads` folder inside the project directory (on your USB drive).

### ⏳ 24-Hour Self-Destruct
A built-in interval automatically deletes files older than 24 hours to keep your USB drive from filling up.

### 🐧 Cross-Platform
Includes `.bat` and `.sh` scripts to instantly launch the server on Windows and Linux.

---

# 🛡️ Admin Control System

DeadDrop includes an **optional admin moderation system** that allows the host to control how users interact with the drop zone.

## 🔑 Admin Access

The host can enter a secret **Admin Key** to unlock the admin panel.

Once authenticated, the admin gets full control over the session.

---

## ⚙️ Admin Permissions

The admin can:

### 💬 Control Messaging
- Allow or disable chat globally
- Restrict specific users from sending messages

### 📤 Control File Uploads
- Allow or block users from uploading files
- Set upload permissions per user

### 🗑️ File Moderation
- Delete any uploaded file
- Remove unwanted or inappropriate content

### 👁️ View Control
- Set users to **view-only mode**

### 🚫 User Blocking
- Block specific users from interacting with the system
- Prevent them from uploading, messaging, or accessing files

---

# 🚀 How to Run (Pre-Built USB)

If you have this folder on a USB drive with the `node` binaries already placed inside:

### Windows
Double-click:
