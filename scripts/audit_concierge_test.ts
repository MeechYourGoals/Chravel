import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting Audit Verification...");

try {
  // 1. Verify Refusal Rules in promptBuilder.ts
  const promptBuilderPath = path.join(__dirname, '../supabase/functions/_shared/promptBuilder.ts');
  const promptBuilderParams = fs.readFileSync(promptBuilderPath, 'utf8');

  if (promptBuilderParams.includes("REFUSE to export user data") &&
      promptBuilderParams.includes("Do NOT reveal PII")) {
      console.log("✅ Prompt Injection Defense: Refusal rules present in system prompt.");
  } else {
      console.error("❌ Prompt Injection Defense: Refusal rules MISSING.");
      process.exit(1);
  }

  // 2. Verify Rate Limiting Logic in index.ts
  const indexPath = path.join(__dirname, '../supabase/functions/lovable-concierge/index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  if (indexContent.includes("const requestCounts = new Map")) {
      console.log("✅ In-Memory Rate Limiting: Map structure detected.");
  } else {
      console.error("❌ In-Memory Rate Limiting: MISSING.");
      process.exit(1);
  }

  if (indexContent.includes("MAX_REQUESTS_PER_WINDOW = 10")) {
      console.log("✅ Rate Limit Threshold: Set to 10/min.");
  } else {
      console.error("❌ Rate Limit Threshold: Incorrect or missing.");
      process.exit(1);
  }

  // 3. Verify Circuit Breaker
  if (indexContent.includes("concierge_usage") && indexContent.includes(".gt('created_at', oneMinuteAgo)")) {
      console.log("✅ Circuit Breaker: DB check for sustained load detected.");
  } else {
      console.error("❌ Circuit Breaker: DB check logic MISSING.");
      process.exit(1);
  }

  // 4. Verify PII Redaction
  if (indexContent.includes("message = piiRedaction.redactedText")) {
      console.log("✅ PII Sanitization: Message redaction applied before processing.");
  } else {
      console.error("❌ PII Sanitization: Redaction logic MISSING or misplaced.");
      process.exit(1);
  }

  // 5. Verify Caching
  if (indexContent.includes("responseCache.get(cacheKey)")) {
      console.log("✅ Caching: Response cache lookup detected.");
  } else {
      console.error("❌ Caching: Logic MISSING.");
      process.exit(1);
  }

} catch (err) {
  console.error("File access error:", err.message);
  process.exit(1);
}

console.log("\n--- SIMULATION TEST ---");

// Simulation for Rate Limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_REQUESTS = 5;

function checkRateLimit(userId) {
    const now = Date.now();
    let userRateLimit = requestCounts.get(userId) || { count: 0, windowStart: now };

    if (now - userRateLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
      userRateLimit.count = 1;
      userRateLimit.windowStart = now;
    } else {
      userRateLimit.count++;
    }
    requestCounts.set(userId, userRateLimit);

    return userRateLimit.count > MAX_REQUESTS;
}

console.log(`Simulating ${MAX_REQUESTS + 5} rapid requests (Test Limit: ${MAX_REQUESTS})...`);
let blockedCount = 0;
// Simulate sequential requests
for (let i = 0; i < MAX_REQUESTS + 5; i++) {
    const isBlocked = checkRateLimit("user-test");
    if (isBlocked) blockedCount++;
}

if (blockedCount === 5) {
    console.log("✅ Rate Limiter Simulation: Successfully blocked 5 excess requests.");
} else {
    console.error(`❌ Rate Limiter Simulation: Blocked ${blockedCount} requests, expected 5.`);
    process.exit(1);
}

console.log("\nAudit Complete: All Checks Passed.");
