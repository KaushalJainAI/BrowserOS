/**
 * The application registry.
 *
 * One declaration per app carrying everything the shell needs: presentation,
 * default geometry, search keywords, and whether the app supports multiple
 * concurrent windows. Keeping it out of the context means the dock, launcher,
 * search, window manager and the agent all read the same source of truth.
 *
 * `id` values match the backend's `APP_ALIASES` / `APP_TITLES` maps in
 * `Backend/buddy/views.py`, so `os_open_app` payloads resolve without mapping.
 */

import {
  Settings, Folder, Clock, Terminal, MessageSquare, Image, Video,
  Presentation, FileText, Share2, BarChart2, PenTool, Table,
  Cloud, Code, Calculator, Gamepad2, Cpu, Clipboard, Camera,
  type LucideIcon,
} from 'lucide-react';
import type { AppId } from '../types/os';

export type AppCategory = 'system' | 'create' | 'data' | 'dev' | 'fun';

export interface AppMeta {
  id: AppId;
  title: string;
  /** One line shown in the launcher and search results. */
  description: string;
  icon: LucideIcon;
  category: AppCategory;
  /** Tailwind gradient stops used for the app tile. */
  tint: string;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  /** Extra search terms beyond the title. */
  keywords: string[];
  /** Apps that open documents allow several windows at once. */
  multiInstance?: boolean;
}

export const APPS: Record<AppId, AppMeta> = {
  explorer: {
    id: 'explorer',
    title: 'Files',
    description: 'Browse, organise and open everything in your workspace',
    icon: Folder,
    category: 'system',
    tint: 'from-amber-400 to-orange-500',
    defaultSize: { width: 900, height: 580 },
    minSize: { width: 520, height: 340 },
    keywords: ['finder', 'explorer', 'folder', 'documents', 'browse'],
    multiInstance: true,
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    description: 'A real shell over the BrowserOS filesystem',
    icon: Terminal,
    category: 'dev',
    tint: 'from-zinc-500 to-zinc-700',
    defaultSize: { width: 760, height: 460 },
    minSize: { width: 420, height: 260 },
    keywords: ['shell', 'console', 'command', 'bash', 'cli'],
    multiInstance: true,
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    description: 'Appearance, agent behaviour and workspace preferences',
    icon: Settings,
    category: 'system',
    tint: 'from-slate-400 to-slate-600',
    defaultSize: { width: 860, height: 600 },
    minSize: { width: 560, height: 400 },
    keywords: ['preferences', 'theme', 'wallpaper', 'accent', 'config'],
  },
  clock: {
    id: 'clock',
    title: 'Clock',
    description: 'World clocks, stopwatch and timers',
    icon: Clock,
    category: 'system',
    tint: 'from-sky-400 to-blue-600',
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 420, height: 360 },
    keywords: ['time', 'timer', 'stopwatch', 'alarm', 'world'],
  },
  chatbot: {
    id: 'chatbot',
    title: 'AskBuddy',
    description: 'Full-window conversation with your OS agent',
    icon: MessageSquare,
    category: 'system',
    tint: 'from-indigo-400 to-violet-600',
    defaultSize: { width: 820, height: 640 },
    minSize: { width: 480, height: 400 },
    keywords: ['ai', 'assistant', 'chat', 'buddy', 'agent'],
  },
  'image-editor': {
    id: 'image-editor',
    title: 'PixelCanvas',
    description: 'Paint, draw and export raster images',
    icon: Image,
    category: 'create',
    tint: 'from-pink-400 to-rose-600',
    defaultSize: { width: 980, height: 660 },
    minSize: { width: 620, height: 460 },
    keywords: ['paint', 'draw', 'image', 'photo', 'canvas', 'brush'],
    multiInstance: true,
  },
  'video-editor': {
    id: 'video-editor',
    title: 'SceneCraft',
    description: 'Sequence clips on a timeline',
    icon: Video,
    category: 'create',
    tint: 'from-fuchsia-400 to-purple-600',
    defaultSize: { width: 1000, height: 640 },
    minSize: { width: 640, height: 460 },
    keywords: ['video', 'timeline', 'clip', 'edit', 'movie'],
  },
  'presentation-editor': {
    id: 'presentation-editor',
    title: 'SlideMaster',
    description: 'Build and present slide decks',
    icon: Presentation,
    category: 'create',
    tint: 'from-orange-400 to-red-500',
    defaultSize: { width: 980, height: 640 },
    minSize: { width: 620, height: 440 },
    keywords: ['slides', 'deck', 'present', 'powerpoint', 'keynote'],
    multiInstance: true,
  },
  'word-editor': {
    id: 'word-editor',
    title: 'DocWriter',
    description: 'Write markdown documents saved to your filesystem',
    icon: FileText,
    category: 'create',
    tint: 'from-blue-400 to-indigo-600',
    defaultSize: { width: 900, height: 640 },
    minSize: { width: 520, height: 380 },
    keywords: ['document', 'write', 'text', 'markdown', 'notes', 'editor'],
    multiInstance: true,
  },
  'diagram-editor': {
    id: 'diagram-editor',
    title: 'FlowForge',
    description: 'Sketch node-and-edge diagrams',
    icon: Share2,
    category: 'create',
    tint: 'from-teal-400 to-emerald-600',
    defaultSize: { width: 980, height: 660 },
    minSize: { width: 620, height: 440 },
    keywords: ['diagram', 'flowchart', 'graph', 'nodes', 'workflow'],
    multiInstance: true,
  },
  analyst: {
    id: 'analyst',
    title: 'DataLab',
    description: 'Chart and summarise CSV data from your files',
    icon: BarChart2,
    category: 'data',
    tint: 'from-emerald-400 to-green-600',
    defaultSize: { width: 960, height: 640 },
    minSize: { width: 600, height: 440 },
    keywords: ['data', 'chart', 'analysis', 'csv', 'statistics', 'notebook'],
    multiInstance: true,
  },
  'svg-maker': {
    id: 'svg-maker',
    title: 'VectorStudio',
    description: 'Compose and export vector graphics',
    icon: PenTool,
    category: 'create',
    tint: 'from-lime-400 to-green-500',
    defaultSize: { width: 980, height: 660 },
    minSize: { width: 640, height: 460 },
    keywords: ['svg', 'vector', 'shape', 'illustrator', 'design'],
    multiInstance: true,
  },
  'sheets-editor': {
    id: 'sheets-editor',
    title: 'GridCalc',
    description: 'Spreadsheet with live formulas over your CSV files',
    icon: Table,
    category: 'data',
    tint: 'from-green-400 to-teal-600',
    defaultSize: { width: 1000, height: 620 },
    minSize: { width: 620, height: 400 },
    keywords: ['spreadsheet', 'excel', 'sheet', 'csv', 'formula', 'grid'],
    multiInstance: true,
  },
  drive: {
    id: 'drive',
    title: 'CloudVault',
    description: 'Synced storage and recent activity',
    icon: Cloud,
    category: 'data',
    tint: 'from-cyan-400 to-blue-600',
    defaultSize: { width: 900, height: 600 },
    minSize: { width: 560, height: 400 },
    keywords: ['cloud', 'storage', 'sync', 'drive', 'backup'],
  },
  'frontend-expert': {
    id: 'frontend-expert',
    title: 'WebWeaver',
    description: 'Edit HTML/CSS/JS with a live preview',
    icon: Code,
    category: 'dev',
    tint: 'from-violet-400 to-indigo-600',
    defaultSize: { width: 1040, height: 660 },
    minSize: { width: 640, height: 440 },
    keywords: ['code', 'html', 'css', 'javascript', 'web', 'preview', 'sandbox'],
    multiInstance: true,
  },
  calculator: {
    id: 'calculator',
    title: 'CalcPro',
    description: 'Scientific calculator with tape history',
    icon: Calculator,
    category: 'system',
    tint: 'from-slate-400 to-zinc-600',
    defaultSize: { width: 420, height: 620 },
    minSize: { width: 360, height: 520 },
    keywords: ['calc', 'math', 'arithmetic', 'scientific'],
  },
  game: {
    id: 'game',
    title: 'SpaceQuest',
    description: 'Take a break and fly something',
    icon: Gamepad2,
    category: 'fun',
    tint: 'from-purple-400 to-fuchsia-600',
    defaultSize: { width: 760, height: 620 },
    minSize: { width: 520, height: 480 },
    keywords: ['game', 'play', 'arcade', 'space'],
  },
  simulator: {
    id: 'simulator',
    title: 'SimWorld',
    description: 'Real-time particle physics playground',
    icon: Cpu,
    category: 'fun',
    tint: 'from-purple-400 to-indigo-600',
    defaultSize: { width: 980, height: 640 },
    minSize: { width: 620, height: 440 },
    keywords: ['physics', 'particles', 'simulation', 'gravity'],
  },
  clipboard: {
    id: 'clipboard',
    title: 'Clipboard',
    description: 'Everything you have copied, searchable',
    icon: Clipboard,
    category: 'system',
    tint: 'from-yellow-400 to-amber-600',
    defaultSize: { width: 620, height: 620 },
    minSize: { width: 420, height: 400 },
    keywords: ['copy', 'paste', 'history', 'snippets'],
  },
  screenshot: {
    id: 'screenshot',
    title: 'Screen Capture',
    description: 'Capture the desktop and save it to Pictures',
    icon: Camera,
    category: 'system',
    tint: 'from-rose-400 to-pink-600',
    defaultSize: { width: 760, height: 560 },
    minSize: { width: 480, height: 400 },
    keywords: ['screenshot', 'capture', 'snip', 'screen', 'record'],
  },
};

export const APP_IDS = Object.keys(APPS) as AppId[];

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  system: 'System',
  create: 'Create',
  data: 'Data',
  dev: 'Develop',
  fun: 'Play',
};

export function isAppId(value: unknown): value is AppId {
  return typeof value === 'string' && value in APPS;
}

/** Fuzzy-ish app lookup used by search, the launcher, and the shell's `open`. */
export function searchApps(query: string): AppMeta[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return APP_IDS.map((id) => APPS[id]);
  return APP_IDS
    .map((id) => APPS[id])
    .map((app) => {
      const title = app.title.toLowerCase();
      let score = 0;
      if (title === needle) score = 100;
      else if (title.startsWith(needle)) score = 80;
      else if (title.includes(needle)) score = 60;
      else if (app.keywords.some((keyword) => keyword.startsWith(needle))) score = 40;
      else if (app.keywords.some((keyword) => keyword.includes(needle))) score = 25;
      else if (app.description.toLowerCase().includes(needle)) score = 10;
      return { app, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.app.title.localeCompare(b.app.title))
    .map((entry) => entry.app);
}

/** Resolve a loose human/agent string ("files", "docwriter") to an app id. */
export function resolveAppId(value: string): AppId | null {
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  if (isAppId(needle)) return needle;
  const byTitle = APP_IDS.find((id) => APPS[id].title.toLowerCase() === needle);
  if (byTitle) return byTitle;
  const byKeyword = APP_IDS.find((id) => APPS[id].keywords.includes(needle));
  if (byKeyword) return byKeyword;
  return searchApps(needle)[0]?.id ?? null;
}
