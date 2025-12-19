# Ideatr MVP Simplification - Changes Summary

**Branch**: `cursor/simplify-to-core-mvp-5c88`  
**Version**: 0.9.0-mvp  
**Date**: December 8, 2025

## Overview

This branch simplifies Ideatr to focus on the core MVP functionality: **fast idea capture with optional AI enhancement (Ideate button)**. All extra features have been disabled to reduce complexity and focus on the primary value proposition.

## What Was Changed

### 1. Commands (CommandRegistry.ts)
**Disabled commands** (commented out):
- ❌ Validation commands: Search existence, Check duplicates, Find related notes, Quick validate
- ❌ Transformation commands: Name variants, Scaffolds, Mutations, Expand, Reorganize, Guided ideation
- ❌ Lifecycle commands: Change status, Archive/Unarchive, Generate codename
- ❌ View commands: Open dashboard, Open graph view, Open tutorials
- ❌ Management commands: Classify current note, Refresh idea, Export/Import, Generate digest, Elevate to project
- ❌ Batch operations: Reclassify all, Find all duplicates, Refresh all related notes
- ❌ Analysis commands: Find tenuous links, Analyze cluster, Show statistics

**Enabled commands** (MVP core):
- ✅ Capture idea

### 2. Views (main.ts)
**Disabled views** (commented out):
- ❌ Dashboard view (table view with filtering, sorting, pagination)
- ❌ Graph view (relationship visualization)

### 3. Settings (settings.ts)
**Disabled settings sections** (commented out):
- ❌ Validation tools settings (web search, domain checking)
- ❌ Transformation tools settings (name variants, scaffolds)
- ❌ Project elevation settings
- ❌ Tutorial settings

**Enabled settings sections** (MVP core):
- ✅ LLM settings (local AI configuration)
- ✅ Cloud AI settings (API keys for cloud providers)
- ✅ Capture modal settings (keyboard shortcuts)
- ✅ Error logging settings
- ✅ Feedback & support settings

### 4. Local AI Removal (NEW - Dec 8, 2025)
**Complete removal of local AI support:**
- ❌ Removed `ModelManager.ts` (local model management)
- ❌ Removed `LLMSettingsSection` (local AI settings UI)
- ❌ Updated `ServiceInitializer` to cloud-only (removed local AI provider initialization)
- ❌ Updated `IdeatrSettings` interface to make local AI settings optional (for backward compatibility)
- ❌ Removed references to "local AI" from error messages
- ❌ Updated first-launch setup to cloud-only

**Why?** Local AI added significant complexity:
- Platform-specific binaries for multiple architectures
- Model download and management
- File verification and checksums
- Memory management and lifecycle
- Settings complexity

Cloud AI is simpler, faster, and provides better results. Users who need local AI can use custom endpoints (Ollama, etc.).

### 5. Version Updates
- **manifest.json**: Updated version to `0.9.0-mvp` and description
- **package.json**: Updated version to `0.9.0-mvp` and description

### 6. Documentation
- **README-MVP.md**: Created new MVP-focused README explaining the simplified feature set (updated to reflect cloud-only)
- **MVP-CHANGES.md**: This document summarizing all changes

### 7. Bug Fixes
- Fixed TypeScript compilation errors in:
  - `ResurfacingService.ts`: Fixed operator precedence issue with `??` and `||`
  - `SyncService.ts`: Added proper type casting for `FileChange[]`
  - `FeedbackSettingsSection.ts`: Removed unused `@ts-expect-error` directive
  - Removed all ModelManager dependencies (no longer needed after local AI removal)

## Core MVP Features (What's Still Working)

1. **Quick Capture Modal** - Fast idea capture with hotkey (`Cmd/Ctrl + I`)
2. **Save Button** - Save raw ideas as-is (`Alt+Enter`)
3. **Ideate Button** - AI-powered enhancement (`Cmd+Enter` / `Ctrl+Enter`) that:
   - Classifies ideas (category + tags)
   - Generates titles/subject lines
   - Expands ideas with related concepts, questions, next steps
4. **Automatic File Creation** - Creates markdown files in `Ideas/` with frontmatter
5. **Cloud AI Support** - Works with multiple cloud AI providers:
   - Anthropic (Claude)
   - OpenAI (GPT-4, GPT-3.5)
   - Google Gemini
   - Groq
   - OpenRouter (100+ models)
   - Custom endpoints (Ollama, self-hosted, etc.)
6. **First Launch Setup** - Guided cloud AI provider configuration
7. **Settings** - Core settings for cloud AI configuration and capture modal

## What Was Removed (But Can Be Re-enabled)

All disabled features are commented out with clear markers:
- `// ===== EXTRA FEATURES DISABLED FOR MVP =====`
- Followed by instructions on how to re-enable

To re-enable features:
1. Uncomment the relevant imports in the files
2. Uncomment the command registrations / view registrations / settings sections
3. Rebuild the plugin

## Files Modified

### Core Changes
- `src/commands/CommandRegistry.ts` - Disabled all extra commands
- `src/main.ts` - Disabled dashboard and graph views
- `src/settings.ts` - Disabled extra settings sections
- `manifest.json` - Updated version and description
- `package.json` - Updated version and description

### Bug Fixes / Supporting Changes
- `src/services/ResurfacingService.ts` - Fixed operator precedence
- `src/services/SyncService.ts` - Fixed type casting
- `src/settings/sections/FeedbackSettingsSection.ts` - Removed unused ts-expect-error
- `src/services/ModelManager.ts` - Created stub implementation
- `src/settings/sections/LLMSettingsSection.ts` - Updated type assertions
- `src/views/ModelDownloadModal.ts` - Removed unnecessary type assertions

### New Files
- `README-MVP.md` - MVP-focused documentation
- `MVP-CHANGES.md` - This file

## Testing

The plugin has been successfully built:
```bash
npm run build  # ✅ Passes TypeScript compilation
```

Build output: `main.js` (393KB)

## How to Use This Branch

### For Development
```bash
git checkout cursor/simplify-to-core-mvp-5c88
npm install
npm run build
npm run deploy  # Deploy to your vault
```

### For Testing
1. Build the plugin: `npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/ideatr/` directory
3. Reload Obsidian
4. Test the core capture functionality:
   - Press `Cmd/Ctrl + I` to open capture modal
   - Type an idea
   - Test both Save and Ideate buttons
   - Verify idea files are created in `Ideas/` directory
   - Check that only "Capture idea" command appears in command palette

## Reverting to Full Feature Set

If you want to go back to the full feature set:
1. Switch to the main branch or previous version
2. Or uncomment all the disabled sections in this branch

## Notes

- All disabled features are **commented out**, not deleted
- The codebase remains intact - just the registration/initialization is disabled
- This makes it easy to re-enable features in the future
- The MVP focuses on doing one thing really well: fast idea capture

## Philosophy

**Problem**: The full version had too many features, making it complex and hard to understand the core value.

**Solution**: Focus exclusively on the essential workflow - capturing ideas quickly with optional AI enhancement. Everything else is nice-to-have but not essential.

**Result**: A simpler, more focused plugin that does one thing really well.
