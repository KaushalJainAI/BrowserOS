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

BrowserOS is designed to be extensible. Adding an application takes three edits:

1. Create the component in `src/components/apps`.
2. Add its id to `AppId` in `src/types/os.ts` and a metadata entry to `src/os/apps.ts`
   (title, icon, default geometry, search keywords). Ids match the backend's `APP_ALIASES`
   in `Backend/buddy/views.py`, so the agent's `os_open_app` resolves without a mapping.
3. Register a lazy loader in `LOADERS` in `src/components/os/WindowRenderer.tsx`.

Apps read and write their own persisted state through `useWindowState`, and reach the shell
through the narrow hooks in `src/contexts/osState.ts` — `useOSActions` for commands such as
`notify` and `openApp`, and `useOSWindows` / `useOSShell` / `useOSNotifications` /
`useOSAgent` for state. Prefer those over the wide `useOS()` facade: an app that only calls
actions then re-renders only on its own state, not on every OS change.
