# Node.js Builtin Modules Replacement Status

**Note**: This document tracks the replacement of Node.js builtin modules with Obsidian APIs as required by the plugin review process.

## ✅ Completed Replacements

### `path` module
- **Status**: ✅ Fully replaced
- **Replacement**: `src/utils/pathUtils.ts` with `joinPath()`, `resolvePath()`, `isAbsolutePath()`
- **Files updated**: 
  - `src/main.ts`
  - `src/core/ServiceInitializer.ts`
  - `src/settings/sections/TutorialSettingsSection.ts`
  - `src/services/LlamaService.ts`
  - `src/services/ModelManager.ts`
  - `src/services/TutorialManager.ts`

### `os` module
- **Status**: ✅ Mostly replaced
- **Replacement**: `src/utils/platformUtils.ts` with `getPlatform()`, `getArch()`, `getHomeDir()`
- **Note**: RAM information (`os.totalmem()`, `os.freemem()`) is not available in Obsidian's API. System capabilities now return 0 for RAM, with graceful fallback.
- **Files updated**:
  - `src/utils/systemCapabilities.ts`
  - `src/services/LlamaService.ts`
  - `src/services/ModelManager.ts`

### `crypto` module
- **Status**: ✅ Fully replaced
- **Replacement**: Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`)
- **Note**: Web Crypto API doesn't support incremental hashing, so large files are read in chunks and accumulated before hashing.
- **Files updated**:
  - `src/services/ModelManager.ts` (2 instances of `createHash` replaced)

## ⚠️ Remaining Node.js Builtin Imports

### `fs` and `fs/promises` modules
- **Status**: ⚠️ Still in use (necessary for operations outside vault)
- **Files using `fs`**:
  - `src/services/ModelManager.ts` - Downloads and manages model files in `~/.ideatr/models/` (outside vault)
  - `src/services/LlamaService.ts` - Checks for bundled binaries in plugin directory (outside vault)
  - `src/services/TutorialManager.ts` - Reads tutorial files from plugin directory (outside vault)

**Why still needed**: 
- These operations access files **outside the Obsidian vault** (plugin directory, home directory)
- Obsidian's `Vault` API only works with files **inside the vault**
- `vault.adapter` methods work with vault-relative paths, not absolute paths outside the vault

**Possible solutions**:
1. Move model downloads to vault directory (e.g., `.ideatr/models/` in vault root)
2. Use `vault.adapter` with absolute paths (needs verification if supported)
3. Document as acceptable exception for desktop-only functionality

### `child_process` module
- **Status**: ⚠️ Still in use (necessary for spawning processes)
- **Files using `child_process`**:
  - `src/services/LlamaService.ts` - Spawns `llama-server` process
  - `src/utils/ProcessManager.ts` - Manages child processes
  - `src/utils/ProcessHealthMonitor.ts` - Monitors process health

**Why still needed**:
- Obsidian doesn't provide an API for spawning external processes
- Required to run `llama-server` binary for local LLM functionality
- Process management and health monitoring require Node.js `child_process` APIs

**Possible solutions**:
1. Document as acceptable exception for desktop-only functionality (spawning processes is desktop-only)
2. Consider alternative architecture (e.g., communicate with external service via HTTP instead of spawning process)

## Summary

- ✅ **Replaced**: `path`, `os` (mostly), `crypto`
- ⚠️ **Remaining**: `fs`, `fs/promises`, `child_process`
- **Reason**: These are used for operations outside the Obsidian vault or for spawning processes, which Obsidian's API doesn't support

## Recommendations

1. **For `fs` operations**: Consider moving model storage to vault directory to use `Vault` API
2. **For `child_process`**: Document as necessary for desktop-only process spawning functionality
3. **Alternative**: Verify if `vault.adapter` can work with absolute paths outside the vault

