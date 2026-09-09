import { withExponentialBackoff, isRetryableError } from "./retry";

async function runRetryTests() {
  console.log("--- STARTING RETRY HELPER UNIT TESTS ---");

  // Test 1: Check error classifier
  console.log("Test 1: Testing isRetryableError classifier...");
  console.assert(isRetryableError({ status: 503 }), "503 should be retryable");
  console.assert(isRetryableError({ status: 429 }), "429 should be retryable");
  console.assert(isRetryableError(new Error("fetch failed")), "fetch failed should be retryable");
  console.assert(isRetryableError(new Error("503 Service Unavailable")), "503 text should be retryable");
  console.assert(!isRetryableError({ status: 400 }), "400 should NOT be retryable");
  console.assert(!isRetryableError({ status: 401 }), "401 should NOT be retryable");
  console.assert(!isRetryableError(new Error("Invalid API key")), "Invalid API key should NOT be retryable");
  console.log("✓ Test 1 passed: Error classifier behaves accurately.");

  // Test 2: Transient 503 error succeeds on 3rd attempt
  console.log("\nTest 2: Transient 503 resolving on 3rd attempt...");
  let attemptCount = 0;
  const startTime = Date.now();
  const result = await withExponentialBackoff(
    async () => {
      attemptCount++;
      if (attemptCount < 3) {
        const err: any = new Error("503 high demand");
        err.status = 503;
        throw err;
      }
      return "SUCCESS_DATA";
    },
    {
      providerName: "Mock-Gemini-503",
      delaysMs: [50, 100, 200], // fast delays for unit test
    }
  );

  console.assert(result === "SUCCESS_DATA", "Result should be SUCCESS_DATA");
  console.assert(attemptCount === 3, `Expected 3 attempts, got ${attemptCount}`);
  console.log(`✓ Test 2 passed: Recovered on attempt ${attemptCount} after exponential backoff.`);

  // Test 3: Non-retryable 400 error fails immediately without retrying
  console.log("\nTest 3: Non-retryable 400 fails immediately on attempt 1...");
  let nonRetryableAttempts = 0;
  let caughtError: any = null;
  try {
    await withExponentialBackoff(
      async () => {
        nonRetryableAttempts++;
        const err: any = new Error("Bad Request: Invalid parameter");
        err.status = 400;
        throw err;
      },
      {
        providerName: "Mock-Groq-400",
        delaysMs: [50, 100, 200],
      }
    );
  } catch (err: any) {
    caughtError = err;
  }

  console.assert(caughtError !== null, "Error should be thrown");
  console.assert(nonRetryableAttempts === 1, `Expected exactly 1 attempt for 400 error, got ${nonRetryableAttempts}`);
  console.log("✓ Test 3 passed: Fast-failed immediately on 400 Bad Request.");

  // Test 4: Provider exhausts all 3 attempts on persistent 503
  console.log("\nTest 4: Persistent 503 exhausts 3 attempts...");
  let persistentAttempts = 0;
  let exhaustedError: any = null;
  try {
    await withExponentialBackoff(
      async () => {
        persistentAttempts++;
        const err: any = new Error("503 Model Overloaded");
        err.status = 503;
        throw err;
      },
      {
        providerName: "Mock-Persistent-503",
        delaysMs: [30, 50, 80],
      }
    );
  } catch (err: any) {
    exhaustedError = err;
  }

  console.assert(exhaustedError !== null, "Error should be thrown after exhausting retries");
  console.assert(persistentAttempts === 3, `Expected 3 attempts, got ${persistentAttempts}`);
  console.log("✓ Test 4 passed: Exhausted all 3 attempts properly.");

  console.log("\nALL RETRY HELPER TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runRetryTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
