# Ideatr MVP

**Fast idea capture with optional AI enhancement. Simple, focused, and effective.**

## Overview

Ideatr MVP is a streamlined version focused on the core value proposition: **capturing ideas quickly** with an **optional AI enhancement button**.

This MVP version removes all the extra features that were adding complexity and focuses solely on what matters most: getting ideas out of your head and into your vault, fast.

## What This Version Does

### Core Features (Enabled)

1. **Quick Capture Modal** - Press your hotkey (default: `Cmd/Ctrl + I`) to open a lightweight capture modal from anywhere in Obsidian
2. **Save Button** - Save your raw idea as-is with one click (or `Alt+Enter`)
3. **Ideate Button** - One-click AI enhancement that automatically:
   - Classifies your idea (category + tags)
   - Generates a title/subject line
   - Expands the idea with related concepts, questions, and next steps
   - All happens in one action!
4. **Automatic File Creation** - Ideas are automatically saved as markdown files in `Ideas/` with structured frontmatter
5. **Cloud AI Support** - Works with multiple cloud AI providers:
   - Anthropic (Claude)
   - OpenAI (GPT-4, GPT-3.5)
   - Google Gemini
   - Groq
   - OpenRouter (access to 100+ models)
   - Custom endpoints (Ollama, self-hosted, etc.)

### Extra Features (Disabled)

The following features are **disabled** in this MVP to keep the plugin simple and focused:

- ❌ Validation tools (domain check, web search, duplicates, related notes)
- ❌ Transformation tools (name variants, scaffolds, mutations, expand, reorganize)
- ❌ Lifecycle management (status, archive, codename)
- ❌ Dashboard and Graph views
- ❌ Analysis & insights (statistics, clusters, tenuous links, digests)
- ❌ Batch operations (reclassify all, find all duplicates)
- ❌ Management commands (import/export, classify existing notes)
- ❌ Project elevation

**Why?** These features are great for power users, but they added complexity that distracted from the core value: fast idea capture. We're focusing on doing one thing really well.

## Getting Started

### Installation

#### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/FallingWithStyle/obsidian-ideatr/releases)
2. Extract the plugin files to your Obsidian vault's `.obsidian/plugins/ideatr/` directory:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Reload Obsidian or restart the app
4. Enable the plugin in **Settings → Community Plugins → Installed plugins**
5. Configure your AI provider in **Settings → Ideatr**

#### For Developers

```bash
# Clone the repository
git clone https://github.com/FallingWithStyle/obsidian-ideatr.git
cd obsidian-ideatr

# Checkout the MVP branch
git checkout cursor/simplify-to-core-mvp-5c88

# Install dependencies
npm install

# Build the plugin
npm run build

# For development with hot reload
npm run dev

# Deploy to your vault (update path in package.json)
npm run deploy
```

### First Launch Setup

On first launch, Ideatr will guide you through:
1. **AI Provider Selection**: Choose your cloud AI provider
2. **API Key Configuration**: Enter your API key for your chosen provider
3. **Directory Setup**: Verify or configure idea storage directories (automatic)

### Configuration

Access settings via **Obsidian Settings → Ideatr**:

**Core Settings:**
- **Cloud AI**: Set up API keys for cloud providers (Anthropic, OpenAI, Gemini, Groq, OpenRouter, or custom endpoints)
- **Capture Modal**: Customize keyboard shortcuts for Save and Ideate buttons
- **Error Logging**: Configure error tracking and reporting
- **Feedback & Support**: Submit bug reports and feature requests

**Note**: This MVP version uses cloud AI only. Local AI has been removed to keep the plugin simple and focused.

## Usage

### Capturing an Idea

1. Press your configured hotkey (default: `Cmd/Ctrl + I`) or click the lightbulb icon
2. Type your idea in the modal
3. Choose your capture method:
   - **Save Button** (`Alt+Enter`): Saves the raw idea text as-is
   - **Ideate Button** (`Cmd+Enter` / `Ctrl+Enter`): Saves and automatically processes with AI:
     - Auto-classifies with category and tags
     - Generates a title/subject line
     - Expands with related ideas, questions, and next steps
4. Done! Your idea is saved to `Ideas/` as a markdown file

**Pro Tip**: Use the **Ideate** button when you want immediate AI enrichment. Use **Save** for quick capture when you're in a hurry.

### Idea File Structure

Each idea is saved as a markdown file with structured frontmatter:

```yaml
---
type: idea
status: captured
created: 2025-01-15
category: SaaS
tags: [productivity, tool, automation]
---
Your idea text goes here...
```

### Available Commands

In the command palette (`Cmd/Ctrl + P`), you'll find:

- **Capture idea** - Open the quick capture modal

That's it! No overwhelming list of commands. Just capture.

## Project Structure

```
/obsidian-ideatr
  ├── src/                    # TypeScript source code
  │   ├── main.ts            # Plugin entry point
  │   ├── capture/           # Capture modal (CORE FEATURE)
  │   ├── commands/           # Command implementations
  │   │   └── capture/       # Capture commands (only enabled)
  │   ├── core/              # Core plugin infrastructure
  │   ├── services/          # AI services (classification)
  │   │   └── providers/     # LLM provider implementations
  │   └── settings/          # Settings UI (simplified)
  ├── styles.css             # Plugin styles
  ├── manifest.json          # Obsidian plugin manifest
  ├── package.json           # Dependencies and scripts
  └── README-MVP.md          # This file
```

## Why MVP?

**Problem**: The full version of Ideatr grew to include many features (validation, transformation, lifecycle management, views, analysis, batch operations, local AI, etc.). While powerful, this complexity made it harder to:
- Understand what the plugin does
- Get started quickly
- Focus on the core value proposition
- Maintain and support

**Solution**: This MVP focuses on the essential feature that provides the most value: **fast idea capture with optional AI enhancement using cloud providers**. 

Everything else is nice-to-have, but not essential for the core workflow. Local AI has been removed to eliminate complexity around model management and platform-specific binaries.

## What's Next?

This MVP is designed to validate the core value proposition. Based on feedback and usage, we'll decide which additional features to re-enable in future versions.

**Want a specific feature back?** Let us know! [Open an issue](https://github.com/FallingWithStyle/obsidian-ideatr/issues) or send feedback via the settings panel.

## Support

- **GitHub Issues**: Report bugs, request features, or ask questions at [https://github.com/FallingWithStyle/obsidian-ideatr/issues](https://github.com/FallingWithStyle/obsidian-ideatr/issues)
- **Author**: Patrick A Regan <ideatr@paraphlabs.com> ([@FallingWithStyle](https://github.com/FallingWithStyle))

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Obsidian for the excellent plugin API
- The Obsidian community for inspiration and support
- llama.cpp for local AI inference
- All AI provider APIs (Anthropic, OpenAI, Google, Groq, OpenRouter)

---

**Version**: 0.9.0-mvp  
**Focus**: Core capture + optional AI enhancement  
**Philosophy**: Do one thing really well
