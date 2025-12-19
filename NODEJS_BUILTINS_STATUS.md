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

### Obsidian's File Access Rules

**What Obsidian allows:**
- ✅ Access to files **inside the vault** using `Vault` API (`vault.read()`, `vault.write()`, `vault.adapter.*`)
- ✅ Access to files in the **plugin's own directory** (`.obsidian/plugins/ideatr/`) for bundled resources
- ✅ Access to files via `vault.adapter` which works with vault-relative paths

**What Obsidian discourages/restricts:**
- ❌ Using Node.js `fs` module to access files **outside the vault** (e.g., `~/.ideatr/models/`, user's home directory, system directories)
- ❌ Direct file system access outside the vault using Node.js builtins
- ❌ Accessing files in other vaults or arbitrary system locations

**Why these rules exist:**
1. **Security**: Prevents plugins from accessing sensitive files outside the vault
2. **Portability**: Vaults should be self-contained and portable
3. **Mobile compatibility**: Mobile Obsidian doesn't have full file system access
4. **Sandboxing**: Keeps plugins within their intended scope

**Current usage that violates these rules:**
- `ModelManager` stores models in `~/.ideatr/models/` (user's home directory, outside vault)
- This requires Node.js `fs` module to read/write files
- Models are shared across all vaults but stored outside any vault

### Solution: Move Models to Vault Root

**Proposed approach**: Store models in `.ideatr/models/` within the vault root

**Advantages:**
- ✅ Uses Obsidian's `Vault` API (no Node.js `fs` needed)
- ✅ Complies with Obsidian's file access rules
- ✅ Models are part of the vault (portable, version-controllable)
- ✅ Works on mobile Obsidian
- ✅ Self-contained vaults

**Disadvantages:**
- ❌ Models are duplicated per vault (if user has multiple vaults)
- ❌ Larger vault size (models can be 1-4GB each)
- ❌ Git/version control may include large binary files (needs `.gitignore`)
- ❌ Each vault needs to download models separately

**Implementation considerations:**
1. **Migration**: Need to migrate existing models from `~/.ideatr/models/` to vault `.ideatr/models/`
2. **Storage location**: Use `vault.adapter` to create/read/write in `.ideatr/models/` directory
3. **Path resolution**: Use `vault.adapter.basePath` or construct relative paths
4. **File size**: Large model files (1-4GB) may need streaming/chunked writes
5. **Cleanup**: Remove old `~/.ideatr/models/` directory after migration

**Code changes needed:**
- `ModelManager.ts`: Change `modelDir` from `~/.ideatr/models/` to `.ideatr/models/` (vault-relative)
- Use `vault.adapter.write()` instead of `fs.writeFile()`
- Use `vault.adapter.read()` or `vault.read()` instead of `fs.readFile()`
- Use `vault.adapter.exists()` instead of `fs.existsSync()`
- Use `vault.adapter.stat()` instead of `fs.stat()`
- Remove `fs` and `fs/promises` imports from `ModelManager.ts`

**Alternative: Keep current approach**
- Document as acceptable exception for desktop-only functionality
- Models remain shared across vaults
- Requires Node.js `fs` module (violates Obsidian guidelines)
- Won't work on mobile Obsidian

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

**Obsidian's rules on process spawning:**
- Obsidian doesn't explicitly forbid `child_process`, but it's desktop-only
- Mobile Obsidian doesn't support spawning external processes
- This is a necessary exception for local LLM functionality

**Possible solutions**:
1. **Keep current approach** (recommended for now):
   - Document as acceptable exception for desktop-only functionality
   - Local LLM requires spawning processes - no alternative
   - Mobile users would need to use cloud LLM providers instead

2. **Alternative architecture** (future consideration):
   - Run `llama-server` as a separate service/daemon
   - Plugin communicates via HTTP instead of spawning process
   - More complex but allows better separation of concerns
   - Still requires desktop environment for the service

## Summary

- ✅ **Replaced**: `path`, `os` (mostly), `crypto`
- ⚠️ **Remaining**: `fs`, `fs/promises`, `child_process`
- **Reason**: These are used for operations outside the Obsidian vault or for spawning processes, which Obsidian's API doesn't support

## Recommendations

### Priority 1: Move Model Storage to Vault (Recommended)
**Action**: Migrate `ModelManager` to store models in `.ideatr/models/` within vault root

**Benefits:**
- Eliminates need for Node.js `fs` module in `ModelManager.ts`
- Complies with Obsidian's file access guidelines
- Makes vaults self-contained and portable
- Enables mobile Obsidian support

**Implementation steps:**
1. Update `ModelManager` constructor to use vault-relative path: `.ideatr/models/`
2. Replace all `fs.*` calls with `vault.adapter.*` methods
3. Add migration logic to move existing models from `~/.ideatr/models/` to vault
4. Update model path resolution to use vault adapter
5. Test with large model files (streaming/chunked writes if needed)

**Trade-offs to consider:**
- Models will be duplicated if user has multiple vaults
- Vault size will increase significantly (1-4GB per model)
- Need to add `.ideatr/models/` to `.gitignore` if vault is version-controlled
- Each vault needs separate model downloads

### Priority 2: Document `child_process` Exception
**Action**: Document that `child_process` is necessary for desktop-only local LLM functionality

**Rationale:**
- No alternative exists for spawning `llama-server` process
- Mobile Obsidian doesn't support process spawning anyway
- This is an acceptable exception for desktop functionality

### Priority 3: Plugin Directory Access
**Status**: `TutorialManager` and `LlamaService` access plugin directory (`.obsidian/plugins/ideatr/`)

**Current status**: This is **allowed** by Obsidian - plugins can access their own directory
- Plugin directory access is acceptable
- These uses of `fs` are for bundled resources (tutorials, binaries)
- Consider keeping these as-is or migrating tutorials to vault

**Recommendation**: Keep plugin directory access for bundled resources, but consider:
- Moving tutorials to vault (already partially done - tutorials can be in vault)
- Keeping binary checks in plugin directory (necessary for bundled executables)

