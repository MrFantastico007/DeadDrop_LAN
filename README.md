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

Once authenticated, the admin gains full control over the session.

## ⚙️ Admin Permissions

### 💬 Control Messaging

* Allow or disable chat globally
* Restrict specific users from sending messages

### 📤 Control File Uploads

* Allow or block users from uploading files
* Set upload permissions per user

### 🗑️ File Moderation

* Delete any uploaded file
* Remove unwanted or inappropriate content

### 👁️ View Control

* Set users to **view-only mode**

### 🚫 User Blocking

* Block specific users from interacting with the system
* Prevent them from uploading, messaging, or accessing files

---

# 🚀 How to Run (Pre-Built USB)

If you have this folder on a USB drive with the `node` binaries already placed inside:

### Windows

Double-click:

start-windows.bat

### Linux

Run:

./start-linux.sh

Then open the LAN URL shown in the terminal (example):

http://192.168.1.5:3001

Anyone connected to the same Wi-Fi/LAN can access the drop zone through this address.

---

# 🛠️ Setup from Source (Cloning this Repo)

If you cloned this repository from GitHub, **you need to add the Node.js standalone binaries** because they are too large (>100MB) to be hosted on GitHub.

---

## 1️⃣ Download Standalone Node.js Binaries

To make the app truly zero-install on host machines, download the pre-built binaries.

### Windows (`node.exe`)

Download the `.zip` from:
https://nodejs.org/en/download/prebuilt-binaries

Extract **node.exe** into the project root folder.

### Linux (`node`)

Download the `.tar.xz` from:
https://nodejs.org/en/download/prebuilt-binaries

Extract the **node** executable from the `bin/` folder into the project root.

---

## 2️⃣ Build the Application

Once `node.exe` and `node` are in the root folder, run the automated setup script.

Windows:

sys-setup.bat

⚠️ Note:
Do not run this in the root of a `C:\` or `D:\` drive due to permission issues.
Place the project inside another folder first.

---

## 3️⃣ Launch

Run:

start-windows.bat

or

./start-linux.sh

---

# 🏗️ Architecture

### Frontend

React (Vite), Tailwind CSS, Framer Motion
Built into static files inside the `dist/` directory.

### Backend

A single `index.js` file utilizing:

* Express.js
* Socket.io

### Database

`database.json`

Used as a lightweight **local flat-file database**.

### File Handling

`multer` handles file uploads and saves them directly to:

`./uploads`

---

# 🔐 Security Note

The **Admin Key is stored only on the host machine** and never transmitted outside the LAN.

This ensures DeadDrop remains:

* Fully offline
* Private
* Secure within the local network

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the Project
2. Create your Feature Branch

git checkout -b feature/AmazingFeature

3. Commit your Changes

git commit -m "Add some AmazingFeature"

4. Push to the Branch

git push origin feature/AmazingFeature

5. Open a Pull Request

---

# 📄 License

Distributed under the **MIT License**.

See the `LICENSE` file for more information.

---

# 🖤 Author

Built with 🖤 by **Ankush Samanta**
