import React from 'react';

export type AppId = 
  | 'explorer' | 'settings' | 'clock' | 'terminal'
  | 'chatbot' | 'image-editor' | 'video-editor'
  | 'presentation-editor' | 'word-editor' | 'diagram-editor'
  | 'analyst' | 'svg-maker' | 'sheets-editor'
  | 'drive' | 'frontend-expert' | 'calculator'
  | 'game' | 'simulator' | 'clipboard' | 'screenshot';

export interface OSWindow {
  id: string;
  appId: AppId;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  defaultPosition?: { x: number; y: number };
}

export interface AppDefinition {
  id: AppId;
  title: string;
  icon: React.FC<{ size: number; color?: string; className?: string }>;
}

export interface OSNotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead?: boolean;
  time?: string;
}
