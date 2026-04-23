import { useState, useEffect } from 'react';

export function ClockApp() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-container centered p-8">
      <h1 className="text-huge font-light m-0 text-center">
        {time.toLocaleTimeString()}
      </h1>
      <p className="text-secondary text-lg text-center mt-4">
        {time.toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
  );
}
