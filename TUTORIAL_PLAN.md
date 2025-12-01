# Ideatr Tutorial Plan & Assessment

## Executive Summary

**Recommendation**: **Yes, include tutorial files**, but in a lightweight, contextual format rather than heavy onboarding. The app is feature-rich with 30+ commands across 7 categories, and while the README is comprehensive, users may not discover workflows and advanced features organically.

## Current State Assessment

### ✅ What's Self-Evident

1. **Basic Capture Flow**
   - Capture modal is clear with two buttons (Save vs Ideate)
   - Keyboard shortcuts are shown in tooltips
   - First launch setup handles AI configuration

2. **Command Discovery**
   - All commands accessible via Command Palette
   - Tip in capture modal mentions Command Palette
   - Commands are well-organized by category

3. **Core UI Elements**
   - Dashboard view is straightforward (table with filters)
   - Graph view has tooltips on hover
   - Settings are comprehensive

### ⚠️ What's NOT Self-Evident

1. **Workflow Understanding**
   - The complete idea lifecycle (capture → validate → transform → elevate) isn't obvious
   - When to use "Save" vs "Ideate" button (beyond the basic tip)
   - How validation, transformation, and lifecycle management fit together

2. **Advanced Features**
   - Clustering analysis and how to use it
   - Graph view navigation and interaction patterns
   - Batch operations and when they're useful
   - Weekly digest/resurfacing feature
   - Tenuous links discovery

3. **Best Practices**
   - Optimal capture strategies
   - When to validate vs when to transform
   - How to use the dashboard effectively for triage
   - Project elevation workflow

4. **Feature Discovery**
   - 30+ commands might be overwhelming
   - Users might not realize the full power of "Ideate" button
   - Settings organization (10+ sections) might be intimidating

## Tutorial Strategy

### Option 1: Contextual Help Files (Recommended) ⭐

**Approach**: Create markdown tutorial files that users can access on-demand, integrated into the app.

**Pros**:
- Non-intrusive (doesn't force onboarding)
- Users can reference when needed
- Can be updated without code changes
- Fits Obsidian's markdown-native philosophy
- Can be linked from settings, modals, or commands

**Cons**:
- Requires users to seek them out
- Might be missed by users who need help most

**Implementation**:
- Create `Tutorials/` folder in vault (or plugin directory)
- Files:
  - `01-Getting-Started.md` - Quick start guide
  - `02-Capture-Workflows.md` - Save vs Ideate, best practices
  - `03-Validation-Guide.md` - When and how to validate ideas
  - `04-Transformation-Tools.md` - Variants, scaffolds, mutations
  - `05-Lifecycle-Management.md` - Status, archive, elevation
  - `06-Dashboard-Guide.md` - Using filters, triage, clusters
  - `07-Graph-View-Guide.md` - Navigation and analysis
  - `08-Batch-Operations.md` - Reclassify, duplicates, refresh
  - `09-Advanced-Features.md` - Clustering, tenuous links, digest

**Integration Points**:
- Add "Open Tutorials" command
- Link from FirstLaunchSetupModal (optional "View Tutorials" button)
- Link from Settings (help icon or section)
- Link from Dashboard (help button)
- Contextual links in modals (e.g., "Learn more about Ideate" link)

### Option 2: Interactive Tutorial Modal

**Approach**: Step-by-step guided tour on first launch (after AI setup).

**Pros**:
- Ensures users see key features
- Can be interactive and engaging
- Can track completion

**Cons**:
- Can be annoying if users want to skip
- Requires more code maintenance
- Might feel heavy-handed

**Implementation**:
- Multi-step modal with "Next" / "Skip" buttons
- Highlights key UI elements
- Shows example workflows
- Can be re-opened from settings

### Option 3: Hybrid Approach (Best of Both) ⭐⭐

**Approach**: Lightweight contextual help + optional interactive tour.

**Implementation**:
1. **Tutorial Files** (Option 1) - Always available
2. **Optional First-Run Tour** - Dismissible, can be re-opened
3. **Contextual Help Links** - Throughout the app

**Tour Steps**:
1. Welcome + "Ideate" button explanation
2. Command Palette overview
3. Dashboard tour (filters, triage, clusters)
4. Validation workflow example
5. Transformation tools overview
6. "You're all set!" with link to tutorials

## Recommended Implementation Plan

### Phase 1: Tutorial Files (High Priority)

1. **Create Tutorial Files**
   - Write 5-7 focused tutorial markdown files
   - Keep each under 500 words
   - Include screenshots/examples where helpful
   - Use clear headings and step-by-step instructions

2. **Add Tutorial Access**
   - Create "Open Tutorials" command
   - Add tutorial folder to plugin structure
   - Create tutorial index/table of contents

3. **Contextual Links**
   - Add "Learn more" links in key modals
   - Add help section in Settings
   - Link from capture modal (expandable help section)

### Phase 2: Optional Interactive Tour (Medium Priority)

1. **First-Run Tour Modal**
   - 5-6 step tour covering core workflows
   - Dismissible with "Don't show again" option
   - Can be re-opened from Settings

2. **Feature Highlights**
   - Tooltips that can be expanded to tutorials
   - "New feature" badges for recent additions

### Phase 3: Enhanced Discovery (Low Priority)

1. **In-App Help System**
   - Help button in Dashboard
   - Contextual help in Graph View
   - Command descriptions with "Learn more" links

## Content Outline for Tutorial Files

### 01-Getting-Started.md
- What is Ideatr?
- First steps after installation
- Basic capture (Save vs Ideate)
- Where ideas are stored
- Accessing commands

### 02-Capture-Workflows.md
- When to use Save button
- When to use Ideate button
- Keyboard shortcuts
- Best practices for quick capture
- Processing ideas later

### 03-Validation-Guide.md
- What is validation?
- Domain checking
- Existence search
- Duplicate detection
- Related notes discovery
- Quick Validate command

### 04-Transformation-Tools.md
- Name variants (when and why)
- Scaffolds (templates for different idea types)
- Mutations (generating variations)
- Expansion (enriching brief ideas)
- Reorganization (restructuring)

### 05-Lifecycle-Management.md
- Status workflow (captured → validated → promoted → archived)
- Changing status
- Archiving ideas
- Generating codenames
- Elevating to projects

### 06-Dashboard-Guide.md
- Understanding the dashboard
- Using filters effectively
- Triage inbox workflow
- Clusters mini-graph
- Resurfacing old ideas
- Sorting and pagination

### 07-Graph-View-Guide.md
- Understanding the graph
- Navigating relationships
- Category-based coloring
- Interactive features
- Layout algorithms

### 08-Batch-Operations.md
- When to use batch operations
- Reclassify all ideas
- Find all duplicates
- Refresh all related notes
- Best practices

### 09-Advanced-Features.md
- Cluster analysis
- Tenuous links discovery
- Weekly digest
- Idea statistics
- Export/Import

## Success Metrics

**How to measure if tutorials are needed/effective**:
- User feedback in GitHub issues
- Support questions frequency
- Feature adoption rates (if trackable)
- User retention (if trackable)

## Alternative: Enhanced README Only

**If tutorials aren't added**, consider:
- Making README more scannable with better TOC
- Adding "Quick Start" section at top
- Creating workflow diagrams
- Adding FAQ section
- Better command organization in README

## Recommendation

**Proceed with Phase 1 (Tutorial Files)** - They're low-maintenance, non-intrusive, and provide value for users who want to learn more. The app is complex enough that contextual help files would be valuable, especially for advanced features.

**Consider Phase 2 (Interactive Tour)** only if:
- User feedback indicates confusion
- Analytics show low feature adoption
- You want to ensure key workflows are discovered

**Skip if**:
- The app is meant to be minimal/discoverable
- You prefer users to explore organically
- Maintenance burden is a concern

