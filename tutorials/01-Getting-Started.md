# Getting Started with Ideatr

Welcome to Ideatr! This guide will help you get started with capturing and managing your ideas.

## What is Ideatr?

Ideatr is a powerful idea management system for Obsidian that helps you:
- **Capture ideas quickly** with a universal hotkey
- **Classify ideas intelligently** using AI
- **Validate ideas** by checking domains, searching for existing products, and finding duplicates
- **Transform ideas** with name variants, scaffolds, and expansions
- **Manage your idea lifecycle** from capture to project elevation

## First Steps

### 1. Set Up AI (If You Haven't Already)

On first launch, Ideatr will guide you through AI setup. You can choose:
- **Local AI**: Download a free, offline model (requires ~2.3 GB)
  - Uses the default Llama 3.2 3B model, or you can use your own local AI model
  - To use a different local model, go to **Settings → Ideatr → AI Configuration** and specify the path to your `.gguf` model file
- **Cloud AI**: Use an API key from providers like Anthropic, OpenAI, or others
- **Skip for Now**: Continue without AI (you can set it up later)

You can always change your AI settings later in **Settings → Ideatr → AI Configuration**.

### 2. Capture Your First Idea

1. Press your configured hotkey (default: `Cmd/Ctrl + I`) or click the lightbulb icon in the ribbon
2. Type your idea in the modal
3. Choose your capture method:
   - **Save Button** (⌘ Enter): Saves the raw idea text as-is
   - **Ideate Button** (⌥ Enter): Saves and automatically processes with AI (classifies, generates title, expands)

### 3. Where Are Ideas Stored?

Ideas are automatically saved as markdown files in the `Ideas/` directory in your vault. Each idea file includes:
- Structured frontmatter (category, tags, status, etc.)
- Your idea text
- Metadata (created date, related notes, etc.)

## Accessing Features

All Ideatr features are accessible via the **Command Palette**:
1. Press `Cmd/Ctrl + P` (or your configured hotkey)
2. Type "Ideatr" to see all available commands
3. Commands are organized by category:
   - **Capture**: Quick idea capture
   - **Validation**: Check domains, duplicates, existence
   - **Transformation**: Generate variants, scaffolds, mutations
   - **Lifecycle**: Change status, archive, generate codenames
   - **Views**: Open Dashboard or Graph View
   - **Management**: Classify, refresh, export, import
   - **Batch Operations**: Reclassify all, find duplicates, refresh relationships
   - **Analysis**: Cluster analysis, tenuous links, statistics

## Next Steps

- Learn about **Capture Workflows** → See [[02-Capture-Workflows|Capture Workflows Guide]]
- Understand **Validation** → See [[03-Validation-Guide|Validation Guide]]
- Explore **Transformation Tools** → See [[04-Transformation-Tools|Transformation Tools Guide]]

---

*Tip: Look for (?) help icons throughout Ideatr to get contextual help on specific features.*

