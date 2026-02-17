# ScrcpyGUI v3 🚀

A modern, high-performance GUI for [scrcpy](https://github.com/Genymobile/scrcpy), completely rebuilt from the ground up with **Tauri v2**, **React 19**, and **Rust**.

![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Support](https://img.shields.io/badge/Support-Patreon-orange.svg)](https://www.patreon.com/cw/KB_kilObit)

ScrcpyGUI v3 is the next evolution of Android device control. By migrating to Tauri v2, we've achieved even smaller binary sizes, better security, and a more responsive UI. This version features a complete visual overhaul and deep integration with the latest scrcpy 3.x features.

## ✨ What's New in v3?

- **⚡ Tauri v2 Migration**: Faster, lighter, and more secure.
- **🎨 UI Overhaul**: A sleek, modern interface with a focus on usability and aesthetics.
- **🌐 Wireless Pairing (A11+)**: Native support for ADB wireless pairing with a dedicated UI.
- **📷 Advanced Camera Mode**: Use your phone as a high-end webcam with full control over camera ID, facing, and high-speed FPS.
- **🖥️ Virtual Display Mode**: Create and manage secondary virtual displays for your device.
- **💾 Smart History**: Remember your wireless connections for one-click re-entry.
- **🛠️ Integrated Tooling**: Auto-downloader for scrcpy binaries and a built-in terminal for advanced users.

## 📱 Key Features

- **🚀 Ultra-Low Latency**: Optimized Rust backend for maximum performance.
- **📱 Device Management**: 
  - Automatic USB discovery.
  - Quick-connect history for wireless devices.
  - "Kill ADB" stack reset for troubleshooting.
- **🎮 Multiple Session Modes**:
  - **Screen Mirroring**: High-performance mirroring with HID (OTG) support.
  - **Camera Mode**: Professional webcam controls.
  - **Desktop Mode**: High-resolution virtual displays.
- **🛠️ Granular Control**:
  - Real-time bitrate and FPS settings.
  - Resolution scaling up to 4K.
  - Recording support (MKV) with custom save paths.
- **📁 File & APK Handling**:
  - Drag & drop APK installation.
  - Drag & drop file pushing directly to `/sdcard/Download/`.
- **🎨 Theming Engine**: 
  - Multiple built-in themes: **Ultraviolet**, **Astro**, **Carbon**, **Emerald**, and **Bloodmoon**.

## 🚀 Getting Started

### Prerequisites

- [scrcpy](https://github.com/Genymobile/scrcpy) (Optional: The app can download it for you!)
- Android device with **USB Debugging** enabled.

### Installation

1. Download the latest release from the [Releases](https://github.com/kil0bit-kb/scrcpy-gui/releases) page.
2. Run the application.
3. If scrcpy is not found, use the in-app **Downloader** in the header.

## 🛠️ Development

### Requirements
- Node.js (v18+)
- Rust & Cargo
- [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Build from Source
1. Clone the repository:
   ```bash
   git clone https://github.com/kil0bit-kb/scrcpy-gui.git
   cd scrcpy-gui
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development mode:
   ```bash
   npm run tauri dev
   ```
4. Build production bundle:
   ```bash
   npm run tauri build
   ```

## 💖 Support the Project

If you find this tool useful, consider supporting development on Patreon. Your support helps me maintain the project and add new features!

[![Patreon](https://img.shields.io/badge/Patreon-Support_KB-F96854?style=for-the-badge&logo=patreon)](https://www.patreon.com/cw/KB_kilObit)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [scrcpy](https://github.com/Genymobile/scrcpy) by Genymobile.
- [Tauri](https://tauri.app/) framework.
- [Lucide Icons](https://lucide.dev/).
