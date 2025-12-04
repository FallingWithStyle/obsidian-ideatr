# Ideatr: Local AI Extraction & Migration Strategy

**Date:** December 4, 2025  
**Purpose:** Remove local AI from Obsidian plugin (v0.9.0) while preserving implementation for future Desktop App  
**Status:** Planning Phase

---

## 🎯 Executive Summary

**Goal:** Strip local AI from Obsidian plugin to pass review, while preserving all local AI code for Desktop App reuse.

**Strategy:**
1. Extract local AI modules to separate repository/package
2. Remove local AI from main plugin (v0.9.0)
3. Resubmit to Obsidian (cloud AI only)
4. Desktop App imports local AI package when ready

**Timeline:**
- Week 1: Extract local AI modules
- Week 2: Remove from plugin, test cloud-only
- Week 3: Resubmit to Obsidian
- Q1 2025: Desktop App development begins

---

## 📦 1. Extraction Strategy: Create `@ideatr/local-ai` Package

### **Option A: Separate NPM Package** ⭐ **(Recommended)**

**Structure:**
```
ideatr-local-ai/                    # New repository
├── package.json
├── tsconfig.json
├── src/
│   ├── LlamaService.ts             # Extracted from plugin
│   ├── ModelManager.ts             # Extracted from plugin
│   ├── ProcessManager.ts           # Extracted from plugin
│   ├── ProcessHealthMonitor.ts     # Extracted from plugin
│   ├── systemCapabilities.ts       # Extracted from plugin
│   ├── types.ts                    # Local AI types
│   └── index.ts                    # Public API exports
├── binaries/                       # Llama.cpp binaries
│   ├── darwin-arm64/
│   ├── darwin-x64/
│   ├── linux-x64/
│   └── win32-x64/
└── README.md
```

**Advantages:**
- ✅ Clean separation of concerns
- ✅ Versioned independently (semantic versioning)
- ✅ Desktop App imports via `npm install @ideatr/local-ai`
- ✅ Can be published to npm (private or public)
- ✅ Easier to test in isolation
- ✅ Future: Could sell as standalone package to other developers

**Disadvantages:**
- ❌ Additional repository to maintain
- ❌ Need to set up npm package publishing
- ❌ Coordination between plugin and package versions

**Implementation:**
```json
// Desktop App package.json
{
  "dependencies": {
    "@ideatr/local-ai": "^1.0.0"
  }
}
```

```typescript
// Desktop App usage
import { LlamaService, ModelManager } from '@ideatr/local-ai';

const llamaService = new LlamaService(config);
await llamaService.initialize();
```

---

### **Option B: Git Submodule** (Alternative)

**Structure:**
```
obsidian-ideatr/                    # Main plugin repo
├── src/
│   └── ... (cloud AI only)
└── local-ai/                       # Git submodule
    ├── src/
    │   ├── LlamaService.ts
    │   ├── ModelManager.ts
    │   └── ...
    └── binaries/

ideatr-desktop/                     # Desktop app repo
├── src/
│   └── ... (desktop app code)
└── local-ai/                       # Same submodule
    └── ... (shared code)
```

**Advantages:**
- ✅ Single source of truth for local AI code
- ✅ No package publishing needed
- ✅ Changes sync across repos

**Disadvantages:**
- ❌ Git submodules are complex and error-prone
- ❌ Harder for contributors to work with
- ❌ Version coordination is manual

**Not recommended** unless you're already comfortable with submodules.

---

### **Option C: Monorepo with Workspaces** (Future-Proofing)

**Structure:**
```
ideatr-monorepo/
├── package.json                    # Root package
├── packages/
│   ├── plugin/                     # Obsidian plugin
│   │   ├── package.json
│   │   └── src/
│   ├── local-ai/                   # Local AI package
│   │   ├── package.json
│   │   └── src/
│   └── desktop/                    # Desktop app
│       ├── package.json
│       └── src/
└── pnpm-workspace.yaml             # Workspace config
```

**Advantages:**
- ✅ All code in one repo
- ✅ Shared dependencies and tooling
- ✅ Easy cross-package refactoring
- ✅ Single CI/CD pipeline

**Disadvantages:**
- ❌ Major restructuring required
- ❌ Delays Obsidian resubmission
- ❌ More complex build setup

**Recommendation:** Consider for v2.0+ when you have all three products (plugin, desktop, mobile).

---

## ✅ **Recommended Approach: Option A (Separate NPM Package)**

Create `@ideatr/local-ai` as standalone package, import into Desktop App when ready.

---

## 🗂️ 2. Files to Extract (From Plugin to Package)

### **Core Local AI Modules**
```
src/services/LlamaService.ts        → @ideatr/local-ai/src/LlamaService.ts
src/services/ModelManager.ts        → @ideatr/local-ai/src/ModelManager.ts
src/utils/ProcessManager.ts         → @ideatr/local-ai/src/ProcessManager.ts
src/utils/ProcessHealthMonitor.ts   → @ideatr/local-ai/src/ProcessHealthMonitor.ts
src/utils/systemCapabilities.ts     → @ideatr/local-ai/src/systemCapabilities.ts
```

### **Binaries**
```
binaries/llama-server-*             → @ideatr/local-ai/binaries/
```

### **Types & Interfaces**
```typescript
// Extract these interfaces from plugin
export interface LlamaConfig {
  modelPath: string;
  contextSize: number;
  nGpuLayers: number;
  // ...
}

export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  // ...
}

// etc.
```

### **Settings UI (Keep in Plugin, but Disabled)**
```
src/settings/sections/LocalLLMSettingsSection.ts  # Keep but hide
```

**Why keep settings UI?**
- Easy to re-enable for testing
- Shows users "local AI available in Desktop App"
- Less code deletion = easier to maintain compatibility

---

## 🚫 3. What to Remove from Plugin (v0.9.0)

### **Step 1: Remove Local AI Provider from Settings**

```typescript
// src/settings/sections/AIProviderSettingsSection.ts

// BEFORE
export const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'local', label: 'Local LLM (Llama.cpp)' },  // ❌ Remove
  { value: 'custom', label: 'Custom Endpoint' },
];

// AFTER
export const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic) - Recommended' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: 'Custom Endpoint' },
];
```

### **Step 2: Add "Desktop App Teaser" in Settings**

```typescript
// src/settings/sections/AIProviderSettingsSection.ts

containerEl.createEl('div', {
  cls: 'setting-item-description',
  text: '💡 Want local AI for complete privacy? Check out Ideatr Desktop App (coming 2025)'
});

containerEl.createEl('a', {
  text: 'Join the waitlist →',
  href: 'https://ideatr.app/desktop',
  cls: 'external-link'
});
```

### **Step 3: Remove Local AI Initialization**

```typescript
// src/core/ServiceInitializer.ts

// BEFORE
if (settings.aiProvider === 'local') {
  this.llamaService = new LlamaService(/* ... */);
  await this.llamaService.initialize();
}

// AFTER
// Remove llamaService entirely
// Fallback to Anthropic if user had 'local' selected
if (settings.aiProvider === 'local') {
  settings.aiProvider = 'anthropic';
  await this.plugin.saveSettings();
  new Notice('Local AI has moved to Ideatr Desktop App. Switched to Claude.');
}
```

### **Step 4: Remove Model Management UI**

```typescript
// src/settings/sections/LocalLLMSettingsSection.ts

// Option A: Delete entire file
// Option B: Keep file but hide section (easier for future testing)

display(): void {
  // Show "Available in Desktop App" message instead
  const { containerEl } = this;
  
  containerEl.createEl('h3', { text: 'Local AI (Desktop App Only)' });
  containerEl.createEl('p', {
    text: 'Local AI with Llama.cpp is available exclusively in Ideatr Desktop App.'
  });
  containerEl.createEl('a', {
    text: 'Learn more about Desktop App →',
    href: 'https://ideatr.app/desktop'
  });
}
```

### **Step 5: Update Dependencies in `package.json`**

```json
// Remove these if no longer needed:
{
  "devDependencies": {
    // ❌ Remove if only used for local AI
    // Check each dependency carefully
  }
}
```

### **Step 6: Clean Up Imports**

```bash
# Search for any remaining imports of local AI modules
grep -r "LlamaService" src/
grep -r "ModelManager" src/
grep -r "ProcessManager" src/

# Remove or comment out
```

---

## 🧪 4. Testing Strategy

### **Phase 1: Test Cloud-Only Plugin**

**Test cases:**
1. ✅ Fresh install with cloud AI provider
2. ✅ Existing user with `local` provider (should auto-switch to `anthropic`)
3. ✅ All AI features work (Ideate Button, validation, etc.)
4. ✅ No `fs` or `child_process` imports in final bundle
5. ✅ Settings UI shows Desktop App teaser

**Commands:**
```bash
# Build plugin
npm run build

# Check for Node.js builtin imports
grep -r "require('fs')" main.js
grep -r "require('child_process')" main.js

# Should return nothing
```

### **Phase 2: Test Extracted Package (Future)**

When building Desktop App:
```bash
# Install local AI package
npm install @ideatr/local-ai

# Test import
import { LlamaService } from '@ideatr/local-ai';
```

---

## 📋 5. Migration Checklist

### **Pre-Extraction (Do First)**
- [ ] Create new repository: `ideatr-local-ai`
- [ ] Set up package structure (`package.json`, `tsconfig.json`, etc.)
- [ ] Copy local AI modules to new repo
- [ ] Update imports/paths in extracted modules
- [ ] Test extracted package builds successfully
- [ ] Publish to npm (private for now) or commit to GitHub

### **Plugin Migration (v0.9.0)**
- [ ] Remove local AI provider from settings dropdown
- [ ] Add Desktop App teaser in settings
- [ ] Remove `LlamaService` initialization
- [ ] Remove `ModelManager` initialization
- [ ] Add migration logic (local → anthropic auto-switch)
- [ ] Remove model management UI
- [ ] Delete/hide Local LLM settings section
- [ ] Remove unused imports
- [ ] Update README (remove local AI docs)
- [ ] Update CHANGELOG (note local AI removal)

### **Testing**
- [ ] Fresh install test (cloud AI works)
- [ ] Migration test (existing `local` users switch to `anthropic`)
- [ ] Build test (no `fs`/`child_process` in bundle)
- [ ] Obsidian review bot test (submit to staging)

### **Resubmission**
- [ ] Update `manifest.json` to v0.9.0
- [ ] Update PR description: "Removed local AI to comply with vault access guidelines"
- [ ] Resubmit to obsidian-releases
- [ ] Monitor review process

---

## 🌳 6. Branch Strategy: Should You Maintain `local-ai` Branch?

### **Answer: No, Don't Maintain Separate Branch** ❌

**Why this is a bad idea:**
1. **Merge hell:** Every feature/bugfix must be backported to `local-ai` branch
2. **Divergence:** Branches drift apart, become incompatible
3. **Support burden:** Two codebases to test and debug
4. **Confusing for users:** Which version should I use?
5. **Obsidian resubmission:** Risk of accidentally submitting wrong branch

**Better approach:**
- Main branch = cloud-only plugin (official)
- Local AI lives in `@ideatr/local-ai` package
- Desktop App imports package when ready
- No branch maintenance needed

**Exception: One-time snapshot**
```bash
# Create snapshot tag before removal (for reference only)
git tag local-ai-snapshot-v0.8.6
git push origin local-ai-snapshot-v0.8.6

# Do NOT create a branch
```

Users who want local AI now:
- Point them to `local-ai-snapshot-v0.8.6` tag
- Make clear: "Unsupported, use at own risk"
- Or just say: "Wait for Desktop App"

---

## 📝 7. Communication Strategy

### **Existing Users (v0.8.6 → v0.9.0 Update)**

**In-app notice:**
```
📢 Ideatr v0.9.0 Update

Local AI has moved to Ideatr Desktop App!

If you were using local Llama.cpp, we've automatically 
switched you to Claude (Anthropic). You'll need to add 
your API key in settings.

Why the change? Obsidian's guidelines require plugins 
to only access vault files. Local AI needs system-level 
access, which is perfect for our upcoming Desktop App.

Want local AI? Join the Desktop App waitlist:
https://ideatr.app/desktop
```

### **New Users (Post-v0.9.0)**

**README.md section:**
```markdown
## AI Provider Options

Ideatr supports these cloud AI providers:
- **Claude (Anthropic)** - Recommended for best results
- **OpenAI** - GPT-4 and GPT-3.5
- **Google** - Gemini models
- **Groq** - Fast inference
- **OpenRouter** - Multi-provider access
- **Custom** - Any OpenAI-compatible endpoint

### Want Local AI?

Ideatr Desktop App (coming Q1 2025) includes:
- Built-in local AI (Llama.cpp)
- No API keys required
- Complete privacy
- Native performance

[Join the waitlist →](https://ideatr.app/desktop)
```

### **GitHub Issue Template**

Add to `.github/ISSUE_TEMPLATE/feature_request.md`:
```markdown
**Note:** Local AI has moved to Ideatr Desktop App. 
If your request is about local LLM support, please join 
the Desktop App waitlist instead of opening an issue.
```

---

## 🎯 8. Desktop App Roadmap Integration

### **Q1 2025: Desktop App Development**

**Phase 1: Electron Shell**
- Set up Electron boilerplate
- Import `@ideatr/local-ai` package
- Test local AI integration

**Phase 2: Port Plugin Features**
- Idea capture modal
- Dashboard view
- All plugin features (cloud + local AI)

**Phase 3: Desktop-Exclusive Features**
- System-wide hotkey (Cmd/Ctrl+I)
- Native menubar integration
- Better performance (no Obsidian overhead)

**Phase 4: Launch**
- Beta testing
- Pricing: $49 one-time purchase
- Marketing: "Privacy-first ideation with local AI"

---

## 🔧 9. Technical Implementation Guide (For Cursor)

### **Step-by-Step Migration**

#### **Step 1: Create `@ideatr/local-ai` Package**

```bash
# Create new directory
mkdir ideatr-local-ai
cd ideatr-local-ai

# Initialize package
npm init -y

# Set up TypeScript
npm install --save-dev typescript @types/node
npx tsc --init
```

**package.json:**
```json
{
  "name": "@ideatr/local-ai",
  "version": "1.0.0",
  "description": "Local AI inference for Ideatr (Llama.cpp wrapper)",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["llama", "local-ai", "llm"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    // Add any required dependencies
  }
}
```

#### **Step 2: Copy Files to Package**

```bash
# From plugin directory
cp src/services/LlamaService.ts ../ideatr-local-ai/src/
cp src/services/ModelManager.ts ../ideatr-local-ai/src/
cp src/utils/ProcessManager.ts ../ideatr-local-ai/src/
cp src/utils/ProcessHealthMonitor.ts ../ideatr-local-ai/src/
cp src/utils/systemCapabilities.ts ../ideatr-local-ai/src/

# Copy binaries
cp -r binaries ../ideatr-local-ai/
```

#### **Step 3: Update Imports in Extracted Files**

```typescript
// ideatr-local-ai/src/index.ts

export { LlamaService } from './LlamaService';
export { ModelManager } from './ModelManager';
export { ProcessManager } from './ProcessManager';
export { ProcessHealthMonitor } from './ProcessHealthMonitor';
export { getSystemCapabilities } from './systemCapabilities';

// Export types
export type {
  LlamaConfig,
  ModelInfo,
  // ... other types
} from './types';
```

#### **Step 4: Remove from Plugin**

```bash
# Delete local AI files
rm src/services/LlamaService.ts
rm src/services/ModelManager.ts
rm src/utils/ProcessManager.ts
rm src/utils/ProcessHealthMonitor.ts

# Keep systemCapabilities if used elsewhere
# Otherwise, delete: rm src/utils/systemCapabilities.ts
```

#### **Step 5: Update Plugin Service Initializer**

```typescript
// src/core/ServiceInitializer.ts

export class ServiceInitializer {
  // Remove llamaService property
  // private llamaService: LlamaService;  // ❌ Delete
  
  async initialize() {
    // Remove local AI initialization
    // if (settings.aiProvider === 'local') { ... }  // ❌ Delete
    
    // Add migration logic
    if (this.settings.aiProvider === 'local') {
      this.settings.aiProvider = 'anthropic';
      await this.plugin.saveSettings();
      
      new Notice(
        'Local AI has moved to Ideatr Desktop App. ' +
        'Switched to Claude (Anthropic). ' +
        'Please add your API key in settings.',
        10000
      );
    }
  }
}
```

#### **Step 6: Update Settings UI**

```typescript
// src/settings/sections/AIProviderSettingsSection.ts

const providers = [
  { value: 'anthropic', label: 'Claude (Anthropic) - Recommended' },
  { value: 'openai', label: 'OpenAI (GPT-4)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'groq', label: 'Groq' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: 'Custom Endpoint' },
  // ❌ Remove: { value: 'local', label: 'Local LLM' }
];

// Add teaser
const desktopTeaser = containerEl.createDiv('desktop-app-teaser');
desktopTeaser.createEl('p', {
  text: '💡 Want local AI for complete privacy?'
});
desktopTeaser.createEl('a', {
  text: 'Check out Ideatr Desktop App (coming 2025) →',
  href: 'https://ideatr.app/desktop',
  cls: 'external-link'
});
```

#### **Step 7: Build and Test**

```bash
# Build plugin
npm run build

# Check for violations
grep -r "require('fs')" main.js
grep -r "require('child_process')" main.js
grep -r "LlamaService" main.js

# All should return empty
```

#### **Step 8: Update Documentation**

**README.md changes:**
- Remove local AI setup instructions
- Add Desktop App teaser
- Update AI provider list

**CHANGELOG.md:**
```markdown
## [0.9.0] - 2025-12-XX

### Changed
- **BREAKING:** Local AI (Llama.cpp) removed from plugin
  - Local AI now exclusive to Ideatr Desktop App (coming Q1 2025)
  - Existing local AI users automatically migrated to Claude (Anthropic)
  - Cloud AI providers remain fully supported

### Added
- Desktop App waitlist link in settings
- Migration notice for local AI users

### Removed
- LlamaService, ModelManager, and related local AI modules
- Model download UI
- Local LLM settings section
```

---

## 🚀 10. Resubmission to Obsidian

### **PR Update Message**

```markdown
## Changes in v0.9.0

This update removes local AI functionality to comply with Obsidian's 
plugin guidelines regarding file system access outside the vault.

### What changed:
- ✅ Removed Node.js `fs` module usage (was used for `~/.ideatr/models/`)
- ✅ Removed Node.js `child_process` usage (was used for llama-server)
- ✅ Local AI functionality moved to upcoming Desktop App
- ✅ Plugin now supports cloud AI providers only:
  - Claude (Anthropic)
  - OpenAI
  - Google Gemini
  - Groq
  - OpenRouter
  - Custom endpoints

### Migration:
- Existing users with local AI are automatically switched to Claude
- In-app notice explains the change
- All other features remain unchanged

### Next steps:
- Local AI will be available in Ideatr Desktop App (Q1 2025)
- Plugin remains free with full cloud AI support
- Desktop App targets users who want local/private AI

This change ensures full compliance with Obsidian's plugin review 
guidelines while maintaining all core ideation features.
```

---

## ✅ Final Checklist

- [ ] Local AI extracted to `@ideatr/local-ai` package
- [ ] Package builds successfully
- [ ] Plugin v0.9.0 removes all local AI code
- [ ] Migration logic tested (local → anthropic)
- [ ] No `fs` or `child_process` in final bundle
- [ ] Settings UI updated with Desktop App teaser
- [ ] README and CHANGELOG updated
- [ ] Git tag created: `local-ai-snapshot-v0.8.6`
- [ ] Resubmit to Obsidian with explanation
- [ ] Monitor review process

---

## 📞 Support Plan

**Users asking "Where's local AI?"**

Response template:
```
Local AI has moved to Ideatr Desktop App to comply with 
Obsidian's plugin guidelines. The plugin now focuses on 
cloud AI providers (Claude, OpenAI, etc.).

Desktop App (coming Q1 2025) will include:
- Built-in local AI (no API keys)
- Native performance
- System-wide hotkey
- Complete privacy

Join the waitlist: https://ideatr.app/desktop

In the meantime, Claude (Anthropic) provides excellent 
results and requires minimal setup.
```

---

**End of Strategy Document**

This document should be saved in your repository as:
`docs/LOCAL_AI_EXTRACTION_STRATEGY.md`

Cursor can use this to plan and execute the migration.