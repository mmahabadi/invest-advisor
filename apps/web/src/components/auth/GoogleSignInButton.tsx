import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GooglePayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

function parseJwt(token: string): GooglePayload {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

interface GoogleSignInButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  onError?: (error: string) => void;
}

export default function GoogleSignInButton({ text = 'continue_with', onError }: GoogleSignInButtonProps) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const googleAuthMutation = useMutation({
    mutationFn: (data: { credential: string; googleId: string; email: string; name: string; avatarUrl?: string }) =>
      authApi.googleAuth(data.credential, data.googleId, data.email, data.name, data.avatarUrl),
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    },
    onError: (error: any) => {
      setIsLoading(false);
      onError?.(error.response?.data?.message || 'Google authentication failed');
    },
  });

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.warn('Google Client ID not configured');
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          text,
          shape: 'rectangular',
          width: 320,
          logo_alignment: 'left',
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
      }
    };

    // Check if Google SDK is loaded
    if (window.google) {
      initializeGoogle();
    } else {
      // Wait for SDK to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initializeGoogle();
        }
      }, 100);

      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000);

      return () => clearInterval(checkGoogle);
    }
  }, [text]);

  const handleCredentialResponse = (response: GoogleCredentialResponse) => {
    setIsLoading(true);
    
    try {
      const payload = parseJwt(response.credential);
      
      googleAuthMutation.mutate({
        credential: response.credential,
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
      });
    } catch (error) {
      setIsLoading(false);
      onError?.('Failed to process Google credentials');
    }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return null;
  }

  if (isLoading || googleAuthMutation.isPending) {
    return (
      <div className="w-full flex items-center justify-center py-3 px-4 bg-surface-800 rounded-lg border border-surface-700">
        <Loader2 className="w-5 h-5 animate-spin text-surface-400 mr-2" />
        <span className="text-surface-400">Signing in with Google...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div 
        ref={buttonRef} 
        className="w-full flex justify-center [&>div]:w-full [&_iframe]:!w-full"
      />
      {!isInitialized && (
        <div className="w-full flex items-center justify-center py-3 px-4 bg-surface-800 rounded-lg border border-surface-700">
          <Loader2 className="w-5 h-5 animate-spin text-surface-400 mr-2" />
          <span className="text-surface-400">Loading Google Sign-In...</span>
        </div>
      )}
    </div>
  );
}
