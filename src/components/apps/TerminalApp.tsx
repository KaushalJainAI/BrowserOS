import { useState } from 'react';

export function TerminalApp() {
  const [output] = useState([
    "ai@browseros:~$ echo \"Welcome to BrowserOS Terminal\"",
    "Welcome to BrowserOS Terminal",
    "ai@browseros:~$"
  ]);

  return (
    <div className="terminal-bg p-4 h-full font-mono text-sm text-white">
      {output.map((line, i) => (
        <p key={i} className="m-0 mb-1">
          {line}
          {i === output.length - 1 && <span className="terminal-cursor" />}
        </p>
      ))}
    </div>
  );
}
