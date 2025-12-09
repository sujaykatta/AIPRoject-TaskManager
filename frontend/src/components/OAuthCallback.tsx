import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { teamsApi } from '../api/client';

export function OAuthCallback() {
  // Prevent double execution in React StrictMode
  const hasExchanged = useRef(false);

  useEffect(() => {
    // If already exchanged, skip (prevents React StrictMode double-call)
    if (hasExchanged.current) {
      return;
    }
    hasExchanged.current = true;

    const handleCallback = async () => {
      // Get authorization code and state from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        const errorDescription = params.get('error_description');
        const errorUri = params.get('error_uri');
        console.error('OAuth error:', error);
        console.error('Error description:', errorDescription);
        console.error('Error URI:', errorUri);

        // Try to notify parent window with detailed error
        if (window.opener) {
          window.opener.postMessage({
            type: 'TEAMS_AUTH_ERROR',
            error: `${error}${errorDescription ? ': ' + errorDescription : ''}`
          }, window.location.origin);
        }
        window.close();
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state in OAuth callback');
        if (window.opener) {
          window.opener.postMessage({ type: 'TEAMS_AUTH_ERROR', error: 'missing_params' }, window.location.origin);
        }
        window.close();
        return;
      }

      // Verify state with parent window via postMessage
      // Since popup can't access parent's sessionStorage, we need parent to verify
      if (window.opener) {
        try {
          // Exchange code for access token
          const tokenData = await teamsApi.exchangeToken(code, state);

          // Store access token in localStorage (shared across windows on same origin)
          localStorage.setItem('teams_access_token', tokenData.access_token);

          // Store expiry time
          const expiresAt = Date.now() + (tokenData.expires_in * 1000);
          localStorage.setItem('teams_token_expires_at', expiresAt.toString());

          // Notify parent window of success
          window.opener.postMessage({ type: 'TEAMS_AUTH_SUCCESS' }, window.location.origin);

          // Close the window
          setTimeout(() => window.close(), 500);
        } catch (err) {
          console.error('Failed to exchange token:', err);
          window.opener.postMessage({
            type: 'TEAMS_AUTH_ERROR',
            error: err instanceof Error ? err.message : 'Token exchange failed'
          }, window.location.origin);
          window.close();
        }
      } else {
        console.error('No opener window found');
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={40} strokeWidth={2} style={{ color: '#6366f1' }} />
      </motion.div>
      <p style={{ color: '#64748b', fontSize: '14px' }}>
        Completing authentication...
      </p>
    </div>
  );
}
