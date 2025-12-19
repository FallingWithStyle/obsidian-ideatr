#!/usr/bin/env node

/**
 * Helper script to identify and categorize promise handling issues
 * This will help us systematically fix all the linting errors
 */

const issueCategories = {
    "Promise returned in function argument where a void return was expected": [
        // CaptureModal.ts
        { file: "src/capture/CaptureModal.ts", line: 213, context: "click handler" },
        { file: "src/capture/CaptureModal.ts", line: 231, context: "click handler" },
        { file: "src/capture/CaptureModal.ts", line: 246, context: "click handler" },
        { file: "src/capture/CaptureModal.ts", line: 781, context: "async callback" },
        { file: "src/capture/CaptureModal.ts", line: 797, context: "async callback" },
        { file: "src/capture/CaptureModal.ts", line: 812, context: "async callback" },
        // ... many more
    ],

    "Promises must be awaited or voided": [
        { file: "src/capture/CaptureModal.ts", line: 262, context: "handleIdeate call" },
        { file: "src/capture/CaptureModal.ts", line: 271, context: "handleSubmit call" },
        // ... many more
    ]
};

// Fix patterns:
// 1. For event handlers: wrap async calls with void operator
//    addEventListener('click', () => this.handleX()) 
//    → addEventListener('click', () => void this.handleX())
//
// 2. For async callbacks: mark as async and await
//    callback: (x) => { doAsync(x) }
//    → callback: async (x) => { await doAsync(x) }
//
// 3. For fire-and-forget: explicitly void
//    this.someAsyncMethod()
//    → void this.someAsyncMethod()

console.log("Promise handling fix patterns identified");
console.log("Run with --fix to apply automated fixes");
