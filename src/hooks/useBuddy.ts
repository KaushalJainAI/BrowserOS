import { useEffect, useRef, useState, useCallback } from 'react';

export interface BuddyAction {
  type: string;
  action: string;
  parameters: Record<string, any>;
}

export function useBuddy(enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [buddyAction, setBuddyAction] = useState<string | null>(null);

  // Capture screen context
  const captureContext = useCallback(() => {
    const interactables = document.querySelectorAll('button, a, input, textarea, select, [role="button"], .os-window, .desktop-icon');
    const elements: any[] = [];

    interactables.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      // Skip hidden elements
      if (htmlEl.offsetParent === null) return;

      const buddyId = `buddy-node-${index}`;
      htmlEl.setAttribute('data-buddy-id', buddyId);
      
      elements.push({
        buddy_id: buddyId,
        tag: htmlEl.tagName.toLowerCase(),
        text: htmlEl.innerText?.trim() || htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('placeholder') || htmlEl.getAttribute('title') || '',
        type: htmlEl.getAttribute('type') || undefined,
        className: htmlEl.className,
      });
    });

    return {
      url: window.location.href,
      title: document.title,
      interactables: elements,
    };
  }, []);

  const sendContextUpdate = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const context = captureContext();
      wsRef.current.send(JSON.stringify({
        type: 'context_update',
        context
      }));
    }
  }, [captureContext]);

  // Execute received actions
  const executeAction = useCallback((action: string, params: Record<string, any>) => {
    setBuddyAction(`Buddy is executing: ${action}`);
    setTimeout(() => setBuddyAction(null), 3000);

    if (action === 'frontend_click') {
      const el = document.querySelector(`[data-buddy-id="${params.buddy_id}"]`) as HTMLElement;
      if (el) {
        // Visual feedback
        const originalOutline = el.style.outline;
        el.style.outline = '4px solid #3b82f6';
        setTimeout(() => {
           el.style.outline = originalOutline;
           el.click();
        }, 500);
      }
    } else if (action === 'frontend_fill') {
      const el = document.querySelector(`[data-buddy-id="${params.buddy_id}"]`) as HTMLInputElement | HTMLTextAreaElement;
      if (el) {
        const originalOutline = el.style.outline;
        el.style.outline = '4px solid #3b82f6';
        setTimeout(() => {
           el.style.outline = originalOutline;
           el.value = params.value;
           el.dispatchEvent(new Event('input', { bubbles: true }));
           el.dispatchEvent(new Event('change', { bubbles: true }));
        }, 500);
      }
    } else if (action === 'frontend_navigate') {
      if (params.url) {
        window.location.href = params.url;
      }
    }
  }, []);

  useEffect(() => {
    let isManualClose = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const connect = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const token = window.localStorage.getItem('authToken');
      if (!token) {
        console.warn('Buddy: No auth token found');
        return;
      }

      // Build robust URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // In development, the backend is typically on 8000. 
      // In production, it might be the same host or a different domain.
      const port = window.location.port === '5173' || window.location.port === '3000' ? '8000' : window.location.port;
      const wsUrl = `${protocol}//${host}${port ? `:${port}` : ''}/ws/buddy/?token=${token}`;

      console.log(`Buddy: Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Buddy: WebSocket connected');
        setIsConnected(true);
        sendContextUpdate();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'trigger_action') {
            executeAction(data.action, data.parameters);
          }
        } catch (err) {
          console.error('Buddy: Failed to parse WS message', err);
        }
      };

      ws.onclose = (event) => {
        if (!isManualClose) {
          console.log(`Buddy: WebSocket disconnected (Code: ${event.code}). Reconnecting...`);
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('Buddy: WebSocket error', err);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      isManualClose = true;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, executeAction, sendContextUpdate]);

  // Optionally set up an observer to periodically update context when DOM changes
  useEffect(() => {
    if (!isConnected || !enabled) return;
    
    // Send context updates when mutations occur, debounced
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sendContextUpdate();
      }, 1000);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [isConnected, enabled, sendContextUpdate]);

  return { isConnected, captureContext, buddyAction };
}
