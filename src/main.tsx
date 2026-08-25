import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { StellarWalletProvider } from './services/stellar/WalletContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import App from './App';
import './input.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <PreferencesProvider>
                    <StellarWalletProvider>
                        <ErrorBoundary>
                            <App />
                        </ErrorBoundary>
                    </StellarWalletProvider>
                </PreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
