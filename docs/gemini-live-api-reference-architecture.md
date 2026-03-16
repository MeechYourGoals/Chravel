# Gemini Live API — Reference Architecture (March 2026)

> Compiled from official Google documentation, Vertex AI docs, and community-validated patterns.
> Sources: ai.google.dev, cloud.google.com/vertex-ai, github.com/google-gemini

---

## 1. WebSocket Endpoint Formats

### Google AI (Generative Language API) — API Key Auth

```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
```

- Auth: API key passed as query parameter (`?key=API_KEY`) or via ephemeral token
- Version: `v1beta` (current, Live API is not yet in `v1`)
- Best for: prototyping, client-side with ephemeral tokens

### Vertex AI (Google Cloud) — OAuth2 / Service Account Auth

```
wss://{LOCATION}-aiplatform.googleapis.com/v1beta1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}
```

- `{LOCATION}`: Google Cloud region (e.g., `us-central1`)
- `{PROJECT_ID}`: GCP project ID
- `{MODEL_ID}`: e.g., `gemini-live-2.5-flash-native-audio`
- Auth: `Authorization: Bearer {ACCESS_TOKEN}` header
- Best for: production server-to-server, enterprise deployments

---

## 2. Authentication Methods

### For Browser Clients (Google AI)

**Ephemeral Tokens** (recommended for production browser apps):

1. Backend authenticates with your real API key (server-side only)
2. Backend calls ephemeral token endpoint to generate a short-lived token
3. Frontend receives the token and uses it for direct WebSocket connection

Token properties:
- `newSessionExpireTime`: 1 minute (to initiate a new session)
- `expireTime`: 30 minutes (to send messages on active connection)
- Can be restricted to single-use (`uses: 1`)
- Can be locked to specific model and configuration constraints
- Token is cryptographically random — NOT derived from your API key

### For Server-to-Server (Vertex AI)

**OAuth2 Bearer Token / Application Default Credentials (ADC)**:

```bash
# Get access token
gcloud auth application-default print-access-token
```

- Access tokens expire after 1 hour — must implement continuous refresh for long-lived connections
- Use service account credentials in production
- Environment variables: `GOOGLE_APPLICATION_CREDENTIALS`, project ID, location

### Proxy Architecture (Recommended for Production)

```
Browser → Your Backend (WebSocket proxy) → Vertex AI Live API
```

- Backend handles all authentication, token refresh, credential management
- Keeps API keys/service account credentials off the client
- Enables rate limiting, logging, session management on your side
- Reduces latency vs. ephemeral token round-trip (for Vertex AI)

---

## 3. Setup Message Schema

The first message sent after WebSocket connection establishes the session configuration. It **must** be a `setup` message.

### Complete Setup Message Structure

```json
{
  "setup": {
    "model": "models/gemini-live-2.5-flash-native-audio",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "temperature": 0.7,
      "maxOutputTokens": 8192,
      "topP": 0.95,
      "topK": 40,
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Kore"
          }
        },
        "languageCode": "en-US"
      }
    },
    "systemInstruction": {
      "parts": [
        {
          "text": "You are a helpful travel assistant..."
        }
      ]
    },
    "tools": [
      {
        "functionDeclarations": [
          {
            "name": "search_places",
            "description": "Search for places near a location",
            "parameters": {
              "type": "OBJECT",
              "properties": {
                "query": { "type": "STRING", "description": "Search query" },
                "location": { "type": "STRING", "description": "City or coordinates" }
              },
              "required": ["query"]
            }
          }
        ]
      },
      {
        "googleSearch": {}
      }
    ],
    "sessionResumption": {
      "handle": null
    },
    "contextWindowCompression": {
      "triggerTokens": 20000,
      "slidingWindow": {
        "targetTokens": 12000
      }
    }
  }
}
```

### Key Setup Fields

| Field | Required | Description |
|-------|----------|-------------|
| `model` | Yes | Model resource name |
| `generationConfig` | Yes | Generation parameters |
| `generationConfig.responseModalities` | Yes | `["AUDIO"]`, `["TEXT"]`, or `["AUDIO", "TEXT"]` |
| `generationConfig.speechConfig` | No | Voice selection, language code |
| `systemInstruction` | No | System prompt |
| `tools` | No | Function declarations, Google Search, etc. |
| `sessionResumption` | No | Enable session resumption with handle |
| `contextWindowCompression` | No | Enable long sessions with sliding window |

### Important Constraints

- Configuration **cannot be updated** while the connection is open
- Configuration (except `model`) **can be changed** via session resumption
- `tools` must be declared at session start — cannot add/remove tools mid-session
- `googleSearch` and `functionDeclarations` must be **separate tool objects** (combining them in the same object causes 400 errors)

---

## 4. Client Message Types

After the setup message, the client can send exactly one of these message types per WebSocket frame:

### 4.1 `realtimeInput` — Audio/Video/Text Streaming

```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "data": "<base64-encoded-PCM16-audio>",
        "mimeType": "audio/pcm;rate=16000"
      }
    ]
  }
}
```

- Audio: raw 16-bit PCM, little-endian, base64-encoded (in JavaScript)
- Input sample rate: **16 kHz** (native; API will resample other rates)
- MIME type must include rate: `audio/pcm;rate=16000`
- Send audio chunks continuously as they're captured from the microphone

### 4.2 `clientContent` — Incremental Content Updates

```json
{
  "clientContent": {
    "turns": [
      {
        "role": "user",
        "parts": [
          { "text": "What restaurants are near our hotel?" }
        ]
      }
    ],
    "turnComplete": true
  }
}
```

- Used for text-based input or injecting context
- `turnComplete: true` signals the model should respond

### 4.3 `toolResponse` — Function Call Results

```json
{
  "toolResponse": {
    "functionResponses": [
      {
        "id": "function-call-id-from-server",
        "name": "search_places",
        "response": {
          "result": {
            "places": [
              { "name": "Ristorante Roma", "rating": 4.5 }
            ]
          }
        }
      }
    ]
  }
}
```

- Sent in response to `toolCall` messages from the server
- Must include the `id` from the original tool call
- Tool responses are **manual** — no automatic execution support in Live API

---

## 5. Server Message Types

Server sends `BidiGenerateContentServerMessage` with one of:

### 5.1 `setupComplete` — Session Ready

```json
{
  "setupComplete": {}
}
```

Sent after successful setup. Client can begin sending audio/content.

### 5.2 `serverContent` — Model Response

```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "audio/pcm;rate=24000",
            "data": "<base64-encoded-audio>"
          }
        }
      ]
    },
    "turnComplete": false
  }
}
```

- Audio output: raw 16-bit PCM, little-endian, **24 kHz** sample rate
- `turnComplete: true` when the model finishes its response turn
- `interrupted: true` when user barge-in interrupts the response
- Audio data arrives in streaming chunks (multiple `serverContent` messages per turn)

### 5.3 `toolCall` — Function Call Request

```json
{
  "toolCall": {
    "functionCalls": [
      {
        "id": "call_abc123",
        "name": "search_places",
        "args": {
          "query": "Italian restaurants",
          "location": "Rome"
        }
      }
    ]
  }
}
```

- Model requests function execution
- Client must execute the function and send back `toolResponse`
- Multiple function calls can be requested simultaneously

### 5.4 `goAway` — Connection Termination Warning

```json
{
  "goAway": {
    "timeLeft": "30s"
  }
}
```

- Sent before the ~10-minute connection limit
- Client should save session state and prepare for reconnection

### 5.5 `sessionResumptionUpdate` — Resumption Token

```json
{
  "sessionResumptionUpdate": {
    "newHandle": "resumption-token-string",
    "resumable": true
  }
}
```

- Provides a token for reconnecting to the same session
- Tokens valid for **2 hours** after session termination
- May return `null` for `newHandle` if session hasn't established enough state

---

## 6. Audio Format Specifications

| Direction | Format | Sample Rate | Encoding | Endianness |
|-----------|--------|-------------|----------|------------|
| **Input** (client → server) | Raw PCM | **16 kHz** | 16-bit signed integer | Little-endian |
| **Output** (server → client) | Raw PCM | **24 kHz** | 16-bit signed integer | Little-endian |

### MIME Types

- Input: `audio/pcm;rate=16000`
- Output: `audio/pcm;rate=24000`

### JavaScript Audio Handling

```javascript
// Capture from microphone (Web Audio API)
const audioContext = new AudioContext({ sampleRate: 16000 });
const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(mediaStream);

// Convert Float32 samples to Int16 PCM
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Send as base64
const pcmData = float32ToInt16(audioBuffer);
const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

ws.send(JSON.stringify({
  realtimeInput: {
    mediaChunks: [{
      data: base64Data,
      mimeType: "audio/pcm;rate=16000"
    }]
  }
}));
```

### Playback (24 kHz output)

```javascript
// Create playback context at 24kHz
const playbackContext = new AudioContext({ sampleRate: 24000 });

// Decode base64 PCM to Float32 for Web Audio
function int16ToFloat32(int16Array) {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 0x8000;
  }
  return float32Array;
}
```

---

## 7. Tool / Function Calling Integration

### Declaration (in setup message)

```json
{
  "tools": [
    {
      "functionDeclarations": [
        {
          "name": "get_trip_details",
          "description": "Get details about a trip including dates, destinations, and participants",
          "parameters": {
            "type": "OBJECT",
            "properties": {
              "trip_id": {
                "type": "STRING",
                "description": "The unique trip identifier"
              }
            },
            "required": ["trip_id"]
          }
        },
        {
          "name": "search_places",
          "description": "Search for places like restaurants, hotels, or attractions",
          "parameters": {
            "type": "OBJECT",
            "properties": {
              "query": { "type": "STRING" },
              "location": { "type": "STRING" },
              "radius_km": { "type": "NUMBER" }
            },
            "required": ["query"]
          }
        }
      ]
    },
    {
      "googleSearch": {}
    }
  ]
}
```

### Important Rules

1. `functionDeclarations` and `googleSearch` must be **separate objects** in the `tools` array
2. All tools must be declared at session start — cannot modify mid-session
3. Tool responses are **manual only** — no automatic execution
4. The model may request multiple function calls simultaneously
5. Each tool call has a unique `id` that must be echoed in the response
6. After sending `toolResponse`, the model will continue generating its response

### Tool Calling Flow

```
1. Client sends audio/text → Server
2. Server determines function call needed
3. Server sends toolCall message with function name + args
4. Client executes function locally
5. Client sends toolResponse with results
6. Server continues generating response (audio/text) incorporating tool results
```

---

## 8. Session Management

### Connection Limits

| Metric | Limit |
|--------|-------|
| WebSocket connection lifetime | ~10 minutes |
| Audio-only session (no compression) | 15 minutes |
| Audio+video session (no compression) | 2 minutes |
| With context window compression | Unlimited |
| Session resumption token validity | 2 hours |
| Concurrent sessions per model | 1,000 |
| Context window | 32K tokens (default), up to 128K |

### Session Resumption Protocol

```
1. Include sessionResumption in setup message
2. Server sends SessionResumptionUpdate with newHandle after sufficient state
3. Client stores the handle
4. On GoAway or disconnect, reconnect with new WebSocket
5. Send setup message with sessionResumption.handle = stored handle
6. Server restores session context
```

### Context Window Compression (for long sessions)

```json
{
  "setup": {
    "contextWindowCompression": {
      "triggerTokens": 20000,
      "slidingWindow": {
        "targetTokens": 12000
      }
    }
  }
}
```

- Audio tokens accumulate at ~25 tokens/second
- Without compression, 15 minutes ≈ 22,500 tokens → hits limit
- Compression uses sliding window to trim older context
- `triggerTokens`: threshold that triggers compression
- `targetTokens`: size after compression

---

## 9. Model Information

### GA Model (Production)

| Property | Value |
|----------|-------|
| Model ID | `gemini-live-2.5-flash-native-audio` |
| Status | **Generally Available (GA)** since December 2025 |
| Input modalities | Text, Images, Audio, Video |
| Output modalities | Text, Audio |
| Languages | 24 languages with automatic switching |
| Voices | 30 HD voices |
| Context window | 32K tokens (default), 128K (extended) |
| Concurrent sessions | Up to 1,000 |

### Key Capabilities

- **Native audio processing**: Unified model (no separate STT/LLM/TTS pipeline)
- **Affective dialog**: Understands and responds to emotional expressions
- **Improved barge-in**: Natural interruption even in noisy environments
- **Proactive audio** (Preview): Only responds to device-directed queries
- **Robust function calling**: Improved triggering rates
- **Audio transcriptions**: Available for both input and output
- **Grounding**: Google Search tool support

### Preview vs GA Differences

| Aspect | Preview | GA |
|--------|---------|-----|
| Model name | `gemini-live-2.5-flash-preview-native-audio-*` | `gemini-live-2.5-flash-native-audio` |
| Stability | May change without notice | Stable API contract |
| SLA | None | Enterprise SLA (Vertex AI) |
| Session resumption | May not fully support stateful resumption | Full support |
| Recommended for | Development/testing | Production |

---

## 10. Best Practices for Production

### Architecture

1. **Use a WebSocket proxy**: Browser → Your server → Vertex AI. Never expose API keys or service account credentials to the client.
2. **Implement session resumption**: Handle `GoAway` messages and reconnect with saved handles for seamless user experience.
3. **Enable context window compression**: Required for sessions longer than 15 minutes.
4. **Use the GA model**: `gemini-live-2.5-flash-native-audio` — not preview models.
5. **Make model configurable**: Use environment variables so model upgrades don't require code changes.

### Audio

6. **Minimize client-side buffering**: Send audio chunks as soon as they're captured, don't batch large buffers.
7. **Match the native input rate**: Capture at 16 kHz to avoid server-side resampling overhead.
8. **Handle output at 24 kHz**: Playback context must match the output sample rate.
9. **Implement proper cleanup**: Close AudioContext, disconnect media streams, close WebSocket on unmount.

### Reliability

10. **Handle all server message types**: `setupComplete`, `serverContent`, `toolCall`, `goAway`, `sessionResumptionUpdate`.
11. **Don't break on `turnComplete`**: Process all remaining messages (including `sessionResumptionUpdate`) before disconnecting.
12. **Implement reconnection with backoff**: Network disconnects happen; retry with exponential backoff.
13. **Set language code**: Match `speechConfig.languageCode` to the user's spoken language for best recognition accuracy.

### Security

14. **Ephemeral tokens for direct browser connections** (Google AI endpoint only): Short-lived, scoped, single-use.
15. **Continuous token refresh for server-to-server** (Vertex AI): Access tokens expire in 1 hour.
16. **Validate all tool call arguments**: Model-generated function args are untrusted input.
17. **Rate limit your proxy**: Prevent abuse of your server-to-Vertex AI connection.

### Known Gotchas

- `sessionResumptionUpdate.newHandle` can be `null` if the session hasn't established enough state (no completed turns yet)
- `turnComplete` may fire prematurely on some preview models — use GA model
- Audio-video sessions have a 2-minute limit without compression (much shorter than audio-only)
- Combined `googleSearch` + `functionDeclarations` in the **same** tool object causes 400 errors — they must be separate objects in the `tools` array
- WebSocket connections timeout at ~10 minutes regardless of session activity — implement reconnection
- Context window fills at ~25 tokens/second for audio — 15 minutes ≈ 22,500 tokens

---

## 11. Reference Links

| Resource | URL |
|----------|-----|
| Live API Overview (Google AI) | https://ai.google.dev/gemini-api/docs/live |
| Live API WebSocket Reference | https://ai.google.dev/api/live |
| Live API Capabilities Guide | https://ai.google.dev/gemini-api/docs/live-guide |
| Session Management | https://ai.google.dev/gemini-api/docs/live-session |
| Tool Use with Live API | https://ai.google.dev/gemini-api/docs/live-tools |
| Ephemeral Tokens | https://ai.google.dev/gemini-api/docs/ephemeral-tokens |
| Vertex AI Live API Overview | https://cloud.google.com/vertex-ai/generative-ai/docs/live-api |
| Vertex AI Get Started (WebSockets) | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/get-started-websocket |
| Vertex AI Session Management | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/start-manage-session |
| Vertex AI Best Practices | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/best-practices |
| Vertex AI Native Audio Blog | https://cloud.google.com/blog/topics/developers-practitioners/how-to-use-gemini-live-api-native-audio-in-vertex-ai |
| GitHub Examples | https://github.com/google-gemini/gemini-live-api-examples |

---

*Last updated: 2026-03-16*
*Compiled from official Google documentation and validated community patterns*
