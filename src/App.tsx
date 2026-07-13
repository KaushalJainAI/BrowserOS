
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { OSProvider } from './contexts/OSContext';
import { DesktopPage } from './pages/DesktopPage';

function App() {
  return (
    <AuthProvider>
      <OSProvider>
        <DesktopPage />
      </OSProvider>
    </AuthProvider>
  );
}

export default App;
