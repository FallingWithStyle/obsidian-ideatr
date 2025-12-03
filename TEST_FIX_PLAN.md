# Test Fix Plan: Addressing 92 Remaining Failures

**Current State**: 891 passing (90.6%), 92 failing (9.4%), 0 uncaught exceptions  
**Target**: 100% pass rate

## Group 1: Modal & DOM Infrastructure (30 failures)
**Priority**: High  
**Estimated Time**: 1-1.5 hours

### Root Causes
1. Missing `setIcon` function from Obsidian API mock
2. Incomplete DOM manipulation methods in MockHTMLElement
3. Missing `domainService` dependency in CaptureModal constructor test
4. Modal interaction patterns not fully mocked

### Files Affected
- `test/unit/CaptureModal.test.ts` (~28 failures)
- `test/unit/FirstLaunchSetupModal.test.ts` (1 failure)
- `test/unit/ModelDownloadModal.test.ts` (estimated)
- `test/unit/CodenameModal.test.ts` (estimated)
- `test/unit/StatusPickerModal.test.ts` (estimated)
- `test/unit/ClassificationResultsModal.test.ts` (estimated)

### Fixes Required

#### 1.1 Add `setIcon` to Obsidian Mock
**File**: `test/mocks/obsidian.ts`
- Add `setIcon` function export that matches Obsidian's API
- Function signature: `setIcon(el: HTMLElement, iconId: string): void`

#### 1.2 Fix MockHTMLElement DOM Methods
**File**: `test/mocks/obsidian.ts`
- Enhance `querySelector` to support more selectors (ID, attribute combinations)
- Add missing DOM methods: `removeChild`, `replaceChild`, `insertBefore`
- Fix `textContent` duplicate member warning (line 342)
- Improve `querySelectorAll` to handle nested queries better

#### 1.3 Fix CaptureModal Dependency Test
**File**: `test/unit/CaptureModal.test.ts`
- Update constructor test to verify `domainService` is stored correctly
- Ensure all 7 dependencies are properly tested

#### 1.4 Mock Icon Utilities
**File**: `test/unit/CaptureModal.test.ts` (and other modal tests)
- Mock `iconUtils.ts` module to avoid `setIcon` calls
- Or ensure `setIcon` is properly mocked globally

### Test Cases to Fix
- All CaptureModal tests that call `onOpen()` (triggers `createStatusIcon`)
- FirstLaunchSetupModal "should mark setup as complete after API key is entered"
- Any modal test that uses icon rendering

---

## Group 2: Integration & Initialization Tests (30 failures)
**Priority**: High  
**Estimated Time**: 1-1.5 hours

### Root Causes
1. Cloud provider initialization expectations mismatch
2. Missing settings properties in test mocks
3. Plugin initialization service availability checks
4. Command registration verification issues

### Files Affected
- `test/unit/ServiceInitializer.test.ts` (1 failure)
- `test/unit/PluginInitialization.integration.test.ts` (~10 failures)
- `test/unit/main.test.ts` (~11 failures)
- `test/unit/CommandRegistry.test.ts` (1 failure)
- Various integration test files (estimated ~7 failures)

### Fixes Required

#### 2.1 Fix Cloud Provider Initialization Test
**File**: `test/unit/ServiceInitializer.test.ts`
- Test expects `ProviderFactory.createProvider` to be called with specific args
- Verify the actual call signature matches expectations
- Ensure mock provider is properly returned and used

#### 2.2 Fix Plugin Initialization Tests
**File**: `test/unit/PluginInitialization.integration.test.ts`
- Ensure all services are properly initialized in `onload()`
- Verify service dependencies are correctly wired
- Fix service availability checks after initialization

#### 2.3 Fix Main Plugin Tests
**File**: `test/unit/main.test.ts`
- Fix Logger initialization test (missing mock setup)
- Fix ModelManager initialization test
- Fix first launch modal tests (settings check logic)
- Fix ServiceInitializer integration test
- Fix view registration tests
- Fix command registration test
- Fix ribbon icon test

#### 2.4 Fix Command Registry Test
**File**: `test/unit/CommandRegistry.test.ts`
- "should register validation commands" - verify validation commands are actually registered
- Check command ID matching logic

#### 2.5 Complete Settings Mocks
**Files**: Multiple test files
- Ensure all test settings objects include all required properties
- Use `DEFAULT_SETTINGS` as base and override specific values
- Add missing properties: `cloudProvider`, `cloudApiKey`, `customEndpointUrl`, `openRouterModel`, etc.

### Test Cases to Fix
- ServiceInitializer cloud provider initialization
- Plugin onload service initialization
- Main plugin initialization sequence
- Command registration verification
- View registration
- Settings tab registration

---

## Group 3: Service Algorithm & Logic Tests (15 failures)
**Priority**: Medium  
**Estimated Time**: 1 hour

### Root Causes
1. Jaccard similarity algorithm implementation mismatch
2. LlamaService async/timing issues with fake timers
3. ModelManager file size verification logic
4. Process cleanup event handler removal

### Files Affected
- `test/unit/SearchService.test.ts` (1 failure - Jaccard similarity)
- `test/unit/LlamaService.test.ts` (~8 failures - timeouts, GPU layers)
- `test/unit/LlamaServiceIdleTimeout.test.ts` (~5 failures - idle timeout)
- `test/unit/ModelManager.test.ts` (estimated ~2 failures)
- `test/unit/LlamaServiceLifecycle.test.ts` (estimated ~1 failure)

### Fixes Required

#### 3.1 Fix Jaccard Similarity Test
**File**: `test/unit/SearchService.test.ts`
- Test expects: "cat dog" vs "dog bird" = 1/3 = 0.333...
- Verify actual implementation matches Jaccard formula
- Check word tokenization and set intersection logic

#### 3.2 Fix LlamaService Timeout Tests
**File**: `test/unit/LlamaService.test.ts`
- Tests timing out after 5 seconds (expecting faster completion)
- Ensure fake timers are properly advanced
- Fix async operation handling with `vi.useFakeTimers()`
- Use `vi.advanceTimersByTimeAsync()` for async operations

#### 3.3 Fix GPU Layer Calculation Tests
**File**: `test/unit/LlamaService.test.ts`
- Tests for 25, 40, 60, 75 GPU layers based on model size
- Verify model size detection logic
- Check GPU layer calculation formula

#### 3.4 Fix Idle Timeout Tests
**File**: `test/unit/LlamaServiceIdleTimeout.test.ts`
- Tests timing out after 5 seconds
- Ensure fake timers advance correctly for 15-minute timeout
- Fix timer reset logic on classification calls
- Verify `keepModelLoaded` setting behavior

#### 3.5 Fix ModelManager File Size Tests
**File**: `test/unit/ModelManager.test.ts`
- "should return true if model size matches expected size"
- "should allow 1% tolerance for file size"
- Verify file size reading and comparison logic

#### 3.6 Fix Process Cleanup Test
**File**: `test/unit/LlamaServiceLifecycle.test.ts`
- "should remove event handlers before killing process"
- Verify event listener cleanup in ProcessManager

### Test Cases to Fix
- Jaccard similarity calculation
- LlamaService classification with timeouts
- GPU layer calculations
- Idle timeout behavior
- Model file size verification
- Process cleanup

---

## Group 4: Logger & Async Timing Tests (7 failures)
**Priority**: Medium  
**Estimated Time**: 30-45 minutes

### Root Causes
1. Debug file detection async timing with fake timers
2. File system mock not properly integrated with async operations
3. Timer advancement not synchronized with file checks

### Files Affected
- `test/unit/logger.test.ts` (7 failures)

### Fixes Required

#### 4.1 Fix Debug File Detection Tests
**File**: `test/unit/logger.test.ts`
- "should detect .ideatr-debug file"
- "should detect .ideatr-debug.md file"
- "should prefer .ideatr-debug over .ideatr-debug.md"
- Use `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()`
- Ensure file system mocks work with async file operations

#### 4.2 Fix Synchronous Debug Check Test
**File**: `test/unit/logger.test.ts`
- "should check debug file synchronously on first debug call"
- Update test expectation to match actual async behavior
- Or fix implementation to be truly synchronous on first call

#### 4.3 Fix Periodic Recheck Tests
**File**: `test/unit/logger.test.ts`
- "should force recheck of debug file"
- "should recheck debug file periodically"
- "should use debug file when settings debug mode is false"
- Ensure timer-based rechecks work with fake timers
- Use `vi.advanceTimersByTimeAsync()` for async file operations

### Test Cases to Fix
- All debug file detection tests (7 total)
- Ensure consistent use of fake timers with async file operations

---

## Group 5: Miscellaneous & Edge Cases (10 failures)
**Priority**: Low  
**Estimated Time**: 45 minutes - 1 hour

### Root Causes
1. Error message string mismatches
2. Service availability stubs
3. Command error handling edge cases
4. Domain service error handling

### Files Affected
- `test/unit/DomainService.test.ts` (1 failure)
- `test/unit/ProspectrService.test.ts` (1 failure)
- `test/unit/commands/CommandErrorHandling.test.ts` (1 failure)
- Various other test files (estimated ~7 failures)

### Fixes Required

#### 5.1 Fix DomainService Error Message
**File**: `test/unit/DomainService.test.ts`
- "should return error when Prospectr is not available"
- Expected: message contains "Prospectr"
- Actual: "Domain checking service is not available"
- Update test expectation or error message to match

#### 5.2 Fix ProspectrService Stub Test
**File**: `test/unit/ProspectrService.test.ts`
- "should return stubbed result when service is not available"
- Verify stub implementation matches test expectations
- Ensure error handling is consistent

#### 5.3 Fix Command Error Handling Test
**File**: `test/unit/commands/CommandErrorHandling.test.ts`
- "should log error if command constructor throws"
- Verify error logging and handling when command construction fails
- Check mock setup for error scenarios

#### 5.4 Fix Remaining Edge Cases
**Files**: Various
- Review remaining failures after Groups 1-4 are fixed
- Address any new patterns discovered
- Fix any test infrastructure issues

### Test Cases to Fix
- DomainService error messages
- ProspectrService stubs
- Command error handling
- Any remaining scattered failures

---

## Implementation Order

### Phase 1: Critical Infrastructure (Groups 1 & 2)
1. Fix `setIcon` mock and DOM infrastructure (Group 1.1-1.2)
2. Fix modal dependency tests (Group 1.3-1.4)
3. Fix integration/initialization tests (Group 2)

**Expected Impact**: ~60 failures fixed

### Phase 2: Algorithm & Timing (Groups 3 & 4)
4. Fix service algorithm tests (Group 3)
5. Fix logger async timing tests (Group 4)

**Expected Impact**: ~22 failures fixed

### Phase 3: Cleanup (Group 5)
6. Fix miscellaneous edge cases (Group 5)

**Expected Impact**: ~10 failures fixed

---

## Success Criteria

- [ ] All 92 tests passing
- [ ] 100% test pass rate
- [ ] No uncaught exceptions
- [ ] All test infrastructure mocks complete
- [ ] Tests match actual implementation patterns

---

## Notes

- All fixes should maintain existing test coverage
- Use TDD approach: fix tests to match implementation, or fix implementation if tests reveal bugs
- Ensure fake timers are used consistently for async operations
- Verify all mocks match actual Obsidian API signatures
- Keep test setup consistent across related test files

