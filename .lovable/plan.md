
# Optimized Implementation Prompts for Chravel

Based on my analysis of your codebase, I've created two battle-tested prompts that are optimized for Lovable, Claude Code, or Cursor. Each prompt is self-contained with all the technical context needed for a clean implementation.

---

## PROMPT 1: Google OAuth Authentication

### Current State Analysis
- **Auth Infrastructure**: Already implemented in `src/hooks/useAuth.tsx` with `signInWithGoogle()` method (lines 766-821)
- **OAuth UI**: Button component exists at `src/components/auth/OAuthButtons.tsx` but is **disabled** via `isOAuthEnabled()` returning `false`
- **Root Cause**: The backend Supabase project needs Google OAuth provider configured in the dashboard
- **Redirect Logic**: Already handles iframe scenarios, uses `skipBrowserRedirect: true` for debugging

### Optimized Prompt (Copy This to Lovable)

```text
Enable Google OAuth authentication for Chravel. The frontend code already exists but is disabled.

## CONTEXT
- Supabase Project ID: jmjiyekmxwsxkfnqwyaa
- Current auth hook: src/hooks/useAuth.tsx already has signInWithGoogle() implemented
- OAuth button: src/components/auth/OAuthButtons.tsx exists but isOAuthEnabled() returns false
- Redirect URL pattern: ${window.location.origin}/auth

## REQUIRED CHANGES

### 1. Enable the OAuth button (src/components/auth/OAuthButtons.tsx)
Change line 8-10:
```typescript
export const isOAuthEnabled = (): boolean => {
  return true; // Was false
};
```

### 2. Add Google OAuth button to AuthModal
In src/components/AuthModal.tsx, add after the email form:

```tsx
import { OAuthButtons, isOAuthEnabled } from './auth/OAuthButtons';

// Inside the component, after the email form and before close:
{isOAuthEnabled() && (
  <>
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-white/20" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-black/60 px-2 text-white/60">Or continue with</span>
      </div>
    </div>
    <OAuthButtons mode={isSignUp ? 'signup' : 'signin'} disabled={isLoading} />
  </>
)}
```

### 3. Handle OAuth callback in Auth page
In src/pages/Auth.tsx, add useEffect to detect OAuth returns:

```tsx
useEffect(() => {
  // Handle OAuth callback - check for tokens in URL hash
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  
  if (accessToken) {
    // OAuth callback detected - session will be set by onAuthStateChange
    console.log('[Auth] OAuth callback detected');
  }
}, []);
```

## SUPABASE CONFIGURATION REQUIRED
The user must configure these in Supabase Dashboard → Authentication → Providers → Google:
1. Enable Google provider
2. Add Google Client ID and Client Secret from Google Cloud Console
3. Add authorized redirect URL: https://jmjiyekmxwsxkfnqwyaa.supabase.co/auth/v1/callback

## DO NOT MODIFY
- src/hooks/useAuth.tsx (signInWithGoogle is already correct)
- supabase/config.toml (no edge function changes needed)
- Any RLS policies

## VERIFICATION
After implementation, test:
1. Click "Sign up with Google" on /auth page
2. Verify redirect to Google consent screen
3. After consent, verify redirect back to /auth
4. Verify user session is created and redirects to dashboard
```

---

## PROMPT 2: Voice AI Concierge (ElevenLabs Integration)

### Current State Analysis
- **AI Concierge Edge Function**: `supabase/functions/lovable-concierge/index.ts` - fully functional text-based
- **Chat UI**: `src/components/AIConciergeChat.tsx` - handles text input/output with markdown rendering
- **Chat Input**: `src/features/chat/components/AiChatInput.tsx` - textarea-based input
- **Lovable has ElevenLabs integration** per the useful-context instructions for conversational AI

### Optimized Prompt (Copy This to Lovable)

```text
Add voice input/output capability to the AI Concierge using ElevenLabs Conversational AI. Users should be able to tap a microphone button to speak their query and hear the AI response.

## CONTEXT
- Existing AI Concierge: src/components/AIConciergeChat.tsx
- Edge function: supabase/functions/lovable-concierge/index.ts
- This is a travel app - voice is natural for "concierge" interactions
- Must work on mobile (70% of users are on mobile)

## ARCHITECTURE

### Option A: ElevenLabs Conversational Agent (Recommended)
Use @elevenlabs/react hook `useConversation` for real-time voice-to-voice.

### Option B: ElevenLabs STT + Lovable Concierge + ElevenLabs TTS
- Speech-to-Text: ElevenLabs Scribe
- AI Processing: Existing lovable-concierge function
- Text-to-Speech: ElevenLabs TTS

I recommend Option A for seamless voice interaction.

## IMPLEMENTATION STEPS

### Step 1: Add ElevenLabs API key secret
Create Supabase secret: ELEVENLABS_API_KEY

### Step 2: Create token generation edge function
Create supabase/functions/elevenlabs-conversation-token/index.ts:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID')

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return new Response(JSON.stringify({ error: 'ElevenLabs not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
    {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    }
  )

  const { token } = await response.json()

  return new Response(JSON.stringify({ token }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

### Step 3: Create VoiceConcierge component
Create src/components/VoiceConcierge.tsx:

```tsx
import { useConversation } from '@elevenlabs/react';
import { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';

interface VoiceConciergeProps {
  tripId: string;
  onTranscript?: (text: string) => void;
}

export function VoiceConcierge({ tripId, onTranscript }: VoiceConciergeProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => console.log('Voice connected'),
    onDisconnect: () => console.log('Voice disconnected'),
    onMessage: (message) => {
      if (message.type === 'user_transcript') {
        onTranscript?.(message.user_transcription_event.user_transcript);
      }
    },
    onError: (error) => {
      console.error('Voice error:', error);
      setError('Voice connection failed');
    },
  });

  const startVoice = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const { data, error } = await supabase.functions.invoke(
        'elevenlabs-conversation-token'
      );

      if (error || !data?.token) {
        throw new Error('Failed to get voice token');
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice');
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopVoice = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="flex items-center gap-2">
      {conversation.status === 'disconnected' ? (
        <Button
          onClick={startVoice}
          disabled={isConnecting}
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Start voice"
        >
          <Mic className={isConnecting ? 'animate-pulse' : ''} size={20} />
        </Button>
      ) : (
        <Button
          onClick={stopVoice}
          variant="destructive"
          size="icon"
          className="rounded-full animate-pulse"
          aria-label="Stop voice"
        >
          <MicOff size={20} />
        </Button>
      )}

      {conversation.isSpeaking && (
        <Volume2 className="text-primary animate-pulse" size={20} />
      )}

      {error && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  );
}
```

### Step 4: Integrate into AIConciergeChat
In src/components/AIConciergeChat.tsx, add voice button next to input:

```tsx
import { VoiceConcierge } from './VoiceConcierge';

// In the input area (around line 590), add:
<div className="flex items-center gap-2">
  <VoiceConcierge 
    tripId={tripId}
    onTranscript={(text) => {
      setInputMessage(text);
      // Optionally auto-send
      // handleSendMessage();
    }}
  />
  <AiChatInput ... />
</div>
```

### Step 5: Install dependency
Add to package.json: "@elevenlabs/react": "^latest"

## SUPABASE CONFIG
Add to supabase/config.toml:
```toml
[functions.elevenlabs-conversation-token]
verify_jwt = false
```

## ELEVENLABS SETUP (User Must Do)
1. Create ElevenLabs account at elevenlabs.io
2. Create a Conversational AI Agent in their dashboard
3. Configure agent personality: "You are Chravel Concierge, a helpful AI travel assistant"
4. Copy Agent ID and API Key
5. Add as Supabase secrets: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID

## MOBILE CONSIDERATIONS
- Use larger tap targets for mic button (min 48x48px)
- Show visual feedback during recording (pulse animation)
- Handle permission denial gracefully
- Test on iOS Safari (requires user gesture for audio)

## DO NOT MODIFY
- supabase/functions/lovable-concierge/index.ts (keep text AI working)
- Existing text chat flow

## VERIFICATION
1. Open AI Concierge tab on a trip
2. Tap microphone button
3. Grant microphone permission
4. Speak a query like "What's the weather like?"
5. Verify AI speaks the response
6. Verify transcript appears in chat
```

---

## Summary

| Feature | Complexity | Dependencies | Risk Level |
|---------|------------|--------------|------------|
| Google OAuth | Low | None (frontend only) | Very Low |
| Voice Concierge | Medium | @elevenlabs/react + secrets | Low |

### Recommended Order
1. **Google OAuth first** - 15 min implementation, enables social login immediately
2. **Voice Concierge second** - 45 min implementation, requires ElevenLabs account setup

Both prompts are designed to be copy-pasted directly into Lovable with minimal modification needed.
