# ⚡ DeadDrop (Offline LAN Version)

> **Real-time. Ephemeral. Portable.**
> A 100% offline, standalone file-sharing application designed to run from a USB drive on any Local Area Network (LAN). 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-Node.js%20|%20React-green.svg)
![Status](https://img.shields.io/badge/status-Portable-brightgreen.svg)

## 📖 About

**DeadDrop Offline** is a zero-install, zero-cloud file sharing tool. It solves the problem of getting a file from a locked-down work/school PC to your phone, or sharing files locally with a group, without needing internet access, cloud storage, or Bluetooth.

You just plug in your USB drive, double-click the starter script, and anyone on the same Wi-Fi/LAN can instantly access the drop zone via your IP address.

---

## ✨ Key Features

* **🔌 100% Offline / USB Portable:** No internet, MongoDB, or Cloudinary required. Everything runs locally on the host machine.
* **⚡ Zero-Install for Clients:** Users just scan a QR code or type an IP address in their browser. No apps to download.
* **📂 Local Storage:** Files are saved directly to an `./uploads` folder inside the project directory (on your USB drive).
* **⏳ 24-Hour Self-Destruct:** A built-in interval automatically deletes files older than 24 hours to keep your USB drive from filling up.
* **🐧 Cross-Platform:** Includes `.bat` and `.sh` scripts to instantly launch the server on Windows and Linux.

---

## 🚀 How to Run (Pre-Built USB)

If you have this folder on a USB drive with the `node` binaries already placed inside:

1. **Windows:** Double-click `start-windows.bat`.
2. **Linux:** Run `./start-linux.sh`.
3. Open the LAN URL provided in the terminal (e.g., `http://192.168.1.5:3001`).

---

## 🛠️ Setup from Source (Cloning this Repo)

If you cloned this repository from GitHub, **you need to add the Node.js standalone binaries** because they are too large (>100MB) to be hosted on GitHub.

### 1. Download Standalone Node.js Binaries
To make the app truly zero-install on host machines, download the pre-built binaries:
* **Windows (`node.exe`):** Download the `.zip` from [Node.js Downloads](https://nodejs.org/en/download/prebuilt-binaries) and extract `node.exe` into the root folder.
* **Linux (`node`):** Download the `.tar.xz` from [Node.js Downloads](https://nodejs.org/en/download/prebuilt-binaries) and extract the `node` executable from the `bin/` folder into the root folder.

### 2. Build the Application
Once `node.exe` and `node` are in the root folder, run the automated setup script to install dependencies and build the React frontend:

**Windows:**
```cmd
sys-setup.bat
```
*(Note: Do not run this in the root of a `C:\` or `D:\` drive due to permission issues. Put the folder inside another folder first).*

### 3. Launch
* Run `start-windows.bat` or `start-linux.sh`.

---

## 🏗️ Architecture

* **Frontend:** React (Vite), Tailwind CSS, Framer Motion. Built into static files in the `dist/` directory.
* **Backend:** A single `index.js` file utilizing Express.js and Socket.io.
* **Database:** `database.json` (Local flat-file storage).
* **File Handling:** `multer` saves files directly to `./uploads`.

---

## 🤝 Contributing

Contributions are welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with 🖤 by [Ankush Samanta]**
