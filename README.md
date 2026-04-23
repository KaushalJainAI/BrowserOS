# BrowserOS

A modern, web-based operating system interface built with React, TypeScript, and Vite. BrowserOS provides a desktop-like experience within the browser, featuring window management, a dock, and a suite of productivity applications.

## Features

- **Window Management**: Draggable and resizable windows for multitasking.
- **Dynamic Dock**: Quick access to your favorite applications.
- **Buddy Assistant**: An integrated AI assistant to help with tasks.
- **Productivity Apps**: Includes a suite of built-in apps like File Explorer, Terminal, Calculator, and more.
- **Modern UI**: Sleek, glassmorphic design with dark mode support.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Drag & Drop**: React Draggable

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Development

BrowserOS is designed to be extensible. You can add new applications by creating components in `src/components/apps` and registering them in the `OSContext`.
