# LLM Lifecycle Management - Manual Testing Guide

This guide provides step-by-step instructions for manually testing the LLM lifecycle management improvements.

## Prerequisites

- Obsidian with Ideatr plugin installed
- Terminal access for process monitoring
- Debug mode enabled in Ideatr settings (for memory monitoring)

## Test 1: Single Instance Enforcement

**Objective**: Verify only one llama-server process runs at a time

### Steps:

1. **Start Obsidian** with Ideatr plugin enabled
2. **Open Terminal** and check for llama-server processes:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```
3. **Expected**: You should see **0 or 1** llama-server process (depending on if you've used AI yet)

4. **Trigger AI classification**:
   - Open Capture Modal (Cmd+I or ribbon icon)
   - Enter an idea and click "Classify"
   
5. **Check processes again**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```
6. **Expected**: Exactly **1** llama-server process

7. **Reload plugin** (Cmd+R in Obsidian)

8. **Check processes again**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```
9. **Expected**: Still exactly **1** llama-server process (or 0 if it was stopped and not restarted yet)

### Success Criteria:
- ✅ Never more than 1 llama-server process at any time
- ✅ Process count remains stable across plugin reloads

---

## Test 2: Cleanup Verification

**Objective**: Verify all resources are properly cleaned up on plugin unload

### Steps:

1. **Start Obsidian** and trigger AI classification (to start llama-server)

2. **Verify server is running**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```
   
3. **Note the PID** of the llama-server process

4. **Disable the plugin**:
   - Settings → Community Plugins → Ideatr → Toggle off
   
5. **Check processes immediately**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```
6. **Expected**: **No llama-server processes** (the server should be stopped)

7. **Re-enable the plugin** and verify it works normally

### Alternative: Obsidian Reload

1. **Start Obsidian** and trigger AI classification
2. **Note the llama-server PID**
3. **Reload Obsidian** (Cmd+R)
4. **Check processes**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```
5. **Expected**: **No orphaned processes** with the old PID

### Success Criteria:
- ✅ llama-server process stops when plugin is disabled
- ✅ No orphaned processes after Obsidian reload
- ✅ Plugin can be re-enabled and works normally

---

## Test 3: Memory Leak Detection

**Objective**: Verify memory usage remains stable over time

### Prerequisites:
- Enable Debug Mode in Ideatr settings

### Steps:

1. **Start Obsidian** with Ideatr plugin

2. **Check initial memory** (wait 1 minute for first snapshot):
   - Open Developer Console (Cmd+Option+I on Mac)
   - Look for memory monitoring logs

3. **Use the plugin normally** for 30 minutes:
   - Capture several ideas
   - Classify them
   - Browse dashboard
   - Open/close capture modal multiple times

4. **Check memory report**:
   - Reload Obsidian (Cmd+R)
   - Check console logs for "Memory report before unload"
   - Note the "Growth since monitoring started" value

### Success Criteria:
- ✅ Memory growth < 10MB over 30 minutes of normal use
- ✅ No "Potential memory leak detected" warnings in console
- ✅ Memory monitor report shows reasonable values

---

## Test 4: Port Conflict Handling

**Objective**: Verify graceful handling of port conflicts

### Steps:

1. **Manually start llama-server** on the default port (8080):
   ```bash
   # Adjust paths to your setup
   llama-server -m /path/to/model.gguf --port 8080
   ```

2. **Start Obsidian** with Ideatr plugin

3. **Try to use AI classification**:
   - Open Capture Modal
   - Enter an idea and click "Classify"

4. **Expected behavior**:
   - Error message about port conflict or server startup failure
   - Plugin should not crash
   - Error should be logged to console

5. **Stop the manual server** (Ctrl+C in terminal)

6. **Try classification again**:
   - Plugin should be able to start its own server now

### Success Criteria:
- ✅ Plugin handles port conflicts gracefully (no crash)
- ✅ Clear error message to user
- ✅ Plugin recovers when port becomes available

---

## Test 5: Crash Recovery

**Objective**: Verify no orphaned processes after Obsidian crash

### Steps:

1. **Start Obsidian** and trigger AI classification

2. **Note the llama-server PID**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```

3. **Force kill Obsidian**:
   ```bash
   # Find Obsidian PID
   ps aux | grep Obsidian | grep -v grep
   # Kill it
   kill -9 <OBSIDIAN_PID>
   ```

4. **Check for orphaned llama-server processes**:
   ```bash
   ps aux | grep llama-server | grep -v grep
   ```

5. **Expected**: 
   - The llama-server process should still be running (orphaned)
   - This is expected behavior - OS will clean it up eventually
   - **OR** it may have been killed by the OS when parent process died

6. **Clean up manually if needed**:
   ```bash
   pkill -f llama-server
   ```

7. **Restart Obsidian**

8. **Verify plugin works normally**:
   - Should detect and handle any port conflicts
   - Should be able to start fresh server

### Success Criteria:
- ✅ Plugin detects orphaned processes or port conflicts
- ✅ Plugin can recover and start new server
- ✅ No accumulation of orphaned processes over multiple crashes

---

## Test 6: Settings Update Propagation

**Objective**: Verify settings changes are properly propagated to LlamaService

### Steps:

1. **Start Obsidian** with Ideatr plugin

2. **Change a setting**:
   - Settings → Ideatr → AI Configuration
   - Toggle "Keep Model Loaded" on/off
   - Or change "Local AI Model"

3. **Verify change takes effect**:
   - For "Keep Model Loaded": Check if idle timer behavior changes
   - For model change: Check if new model is used on next classification

4. **Check console logs**:
   - Should see "LlamaService singleton instance created" only once
   - Should NOT see multiple instances being created

### Success Criteria:
- ✅ Settings changes take effect without creating new LlamaService instance
- ✅ Only one singleton instance exists throughout

---

## Memory Profiling Commands

### Monitor Obsidian Memory Usage
```bash
# Continuous monitoring (updates every 5 seconds)
watch -n 5 'ps aux | grep Obsidian | grep -v grep'
```

### Monitor llama-server Memory Usage
```bash
# Continuous monitoring (updates every 5 seconds)
watch -n 5 'ps aux | grep llama-server | grep -v grep'
```

### Check for Orphaned Processes
```bash
# List all llama-server processes
ps aux | grep llama-server | grep -v grep

# Count them
ps aux | grep llama-server | grep -v grep | wc -l
```

### Kill Orphaned Processes
```bash
# Kill all llama-server processes
pkill -f llama-server

# Or kill specific PID
kill <PID>

# Force kill if needed
kill -9 <PID>
```

### Get Detailed Process Info
```bash
# Get memory usage in MB
ps -o pid,rss,vsz,command -p <PID> | awk 'NR>1 {printf "PID: %s, RSS: %.2f MB, VSZ: %.2f MB\n", $1, $2/1024, $3/1024}'
```

---

## Interpreting Results

### Normal Behavior:
- **1 llama-server process** when AI is active
- **0 llama-server processes** when plugin is disabled or idle timeout triggered
- **Memory growth < 5MB** over 30 minutes
- **Clean shutdown** on plugin disable/reload

### Warning Signs:
- **Multiple llama-server processes** → Singleton pattern not working
- **Orphaned processes after plugin disable** → Cleanup not working
- **Memory growth > 10MB** over 30 minutes → Potential memory leak
- **"Potential memory leak detected"** in console → Investigate further

### Critical Issues:
- **Accumulating processes** over time → Major lifecycle issue
- **Memory growth > 50MB** over 30 minutes → Serious memory leak
- **Plugin crashes** on reload → Cleanup causing errors

---

## Troubleshooting

### If you see multiple llama-server processes:
1. Check console for errors
2. Verify singleton pattern is being used in ServiceInitializer
3. Check if multiple Obsidian instances are running

### If processes are orphaned:
1. Manually kill them: `pkill -f llama-server`
2. Check if cleanup() is being called in onunload
3. Verify LlamaService.destroyInstance() is being called

### If memory grows excessively:
1. Enable debug mode to see memory monitoring logs
2. Check for event listeners not being removed
3. Check for timers not being cleared
4. Look for large objects being retained

---

## Reporting Issues

When reporting issues, please include:

1. **Test that failed** (Test 1, 2, 3, etc.)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Console logs** (if relevant)
5. **Process list output** (if relevant)
6. **Memory report** (if relevant)
7. **Obsidian version**
8. **Plugin version**
9. **Operating system**
