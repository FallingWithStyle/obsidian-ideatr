# Ideatr

A powerful, Obsidian-native "idea intake + triage + transform + validate" tool. Fast capture, intelligent classification, and comprehensive idea management.

## Overview

Ideatr is a comprehensive idea management system for Obsidian that captures ideas quickly, classifies them intelligently using AI, clusters related concepts, deduplicates similar ideas, validates domains and existence, generates variants and scaffolds, and prepares ideas for project elevation.

**Problem**: Creative professionals, entrepreneurs, and knowledge workers generate a large volume of ideas across many domains. These ideas often live in fragmented systems (chat logs, fleeting notes, various apps), causing low retrieval rates, duplicate effort, and missed connections.

**Solution**: Ideatr provides a single, intelligent "front door" for ideas with automatic classification, validation tools, clustering, and seamless integration with your Obsidian vault.

## Features

### Core Capture & Classification
- **Quick Capture Modal**: Universal hotkey opens a lightweight modal anywhere in Obsidian for fast idea capture (<10 seconds)
- **Ideate Button**: One-click AI-powered idea processing! The gold "Ideate" button automatically:
  - Saves your raw idea text
  - Auto-classifies with category and tags
  - Generates a concise title/subject line
  - Expands the idea with related concepts, questions, and next steps
  - All in one action - perfect for rapid idea capture and enrichment
- **Automatic File Creation**: Ideas automatically create markdown files in `Ideas/` directory with structured frontmatter
- **AI Auto-Classification**: Multi-provider LLM-powered categorization, tag suggestions, and related note detection
- **Customizable Keyboard Shortcuts**: Configure your own keyboard shortcuts for Save and Ideate buttons (with tooltips showing shortcuts on hover)
- **First-Launch Setup**: Guided setup wizard for configuring AI models and providers
- **Hybrid LLM Support**: Seamlessly switch between local (Llama.cpp) and cloud AI providers

### AI Providers
- **Local AI**: Built-in Llama.cpp server with bundled binaries (macOS ARM64, Intel, Linux, Windows)
- **Cloud AI**: Support for multiple providers:
  - Anthropic (Claude)
  - OpenAI (GPT-4, GPT-3.5)
  - Google Gemini
  - Groq
  - OpenRouter (access to 100+ models)
  - Custom endpoints (Ollama, self-hosted, etc.)
- **Smart Fallback**: Automatic fallback from cloud to local AI if requests fail
- **Model Management**: Download, configure, and manage local AI models through the UI

### Validation Tools
- **Domain Availability Check**: Quick domain name validation (local or API-based)
- **"Does This Exist?" Search**: Web search integration (Google, DuckDuckGo) to check if ideas already exist
- **Duplicate Detection**: Intelligent similarity detection to prevent redundant ideas
- **Related Notes Discovery**: Automatically find and link related ideas in your vault
- **Quick Validate**: Run all validation checks at once

### Transformation Tools
- **Name Variant Generator**: Generate synonyms, short names, domain hacks, and phonetic variants
- **Scaffold Generator**: Templates for different idea types (project, game mechanic, narrative seed, etc.)
- **Idea Expansion**: Expand brief ideas into detailed descriptions
- **Idea Mutations**: Generate variations and alternative approaches
- **Reorganization**: Restructure and reorganize idea content

### Lifecycle Management
- **Status Management**: Track ideas through lifecycle (captured → validated → promoted → archived)
- **Archive/Unarchive**: Organize ideas with archive functionality
- **Codename Generation**: Generate memorable codenames for ideas
- **Project Elevation**: Promote ideas to full projects with folder structure and Devra metadata

### Views & Visualization
- **Dashboard View**: Comprehensive table view with:
  - Advanced filtering (status, category, tags, date range)
  - Sorting and pagination
  - Clusters mini-graph
  - Resurfacing panel for old ideas
  - Triage inbox for unclassified ideas
- **Graph View**: Interactive graph visualization showing:
  - Idea relationships and clusters
  - Category-based coloring
  - Interactive navigation
  - Layout algorithms (hierarchical, force-directed)

### Analysis & Insights
- **Idea Statistics**: Overview of your idea collection (counts, categories, trends)
- **Cluster Analysis**: Deep dive into idea clusters and relationships
- **Tenuous Links**: Discover unexpected connections between ideas
- **Weekly Digest**: Automated resurfacing of old ideas to prevent forgetting

### Batch Operations
- **Reclassify All Ideas**: Update classification for all ideas at once
- **Find All Duplicates**: Comprehensive duplicate detection across entire vault
- **Refresh All Related Notes**: Update relationship links for all ideas

### Import & Export
- **Export Ideas**: Export ideas to JSON or CSV format
- **Import Ideas**: Import ideas from external sources
- **File Organization**: Automatic organization with configurable folder structures

### Advanced Features
- **Error Logging**: Built-in error tracking for debugging and bug reports
- **Debug Mode**: Developer-friendly debug logging
- **Persistent Filters**: Save filter state across sessions
- **Customizable Settings**: Extensive configuration options for all features

## Getting Started

### Prerequisites
- Obsidian installed and running (v0.15.0 or later)
- TypeScript development environment (for development)
- Optional: Local LLM model (`.gguf` format) or API keys for cloud AI providers

### Installation

#### Install from Community Plugins (Recommended)

Once approved, Ideatr will be available in Obsidian's Community Plugins directory:

1. Open **Obsidian Settings** (⚙️)
2. Navigate to **Community plugins**
3. Ensure **Restricted Mode** is disabled (if enabled, turn it off)
4. Click **Browse** to open the Community Plugins browser
5. Search for **"Ideatr"**
6. Click **Install**, then **Enable**
7. Configure your AI provider in **Settings → Ideatr**
8. (Optional) Set up a hotkey in **Settings → Hotkeys** (search for "Ideatr: Capture Idea")

#### Manual Installation (Pre-release / Development)

If you're installing from source or a pre-release version:

1. Download the latest release from the [Releases page](https://github.com/FallingWithStyle/obsidian-ideatr/releases)
2. Extract the plugin files to your Obsidian vault's `.obsidian/plugins/ideatr/` directory:
   - `main.js`
   - `manifest.json`
   - `styles.css`
   - `binaries/` folder (if included)
3. Reload Obsidian or restart the app
4. Enable the plugin in **Settings → Community Plugins → Installed plugins**
5. Configure your AI provider in **Settings → Ideatr**

#### For Developers

```bash
# Clone the repository
git clone https://github.com/FallingWithStyle/obsidian-ideatr.git
cd obsidian-ideatr

# Install dependencies
npm install

# Build the plugin
npm run build

# For development with hot reload
npm run dev

# Run tests
npm test

# Deploy to your vault (update path in package.json)
npm run deploy
```

### First Launch Setup

On first launch, Ideatr will guide you through:
1. **AI Provider Selection**: Choose between local (Llama.cpp) or cloud AI providers
2. **Model Configuration**: 
   - For local: Download or configure model path
   - For cloud: Enter API keys
3. **Feature Preferences**: Configure which features to enable/disable
4. **Directory Setup**: Verify or configure idea storage directories

### Configuration

Access settings via **Obsidian Settings → Ideatr**:

- **LLM Settings**: Configure local Llama server or cloud AI providers
- **Cloud AI Settings**: Set up API keys for cloud providers
- **Domain Settings**: Configure domain checking (Prospectr integration available)
- **Web Search Settings**: Configure Google/DuckDuckGo search
- **Name Variant Settings**: Configure variant generation options
- **Scaffold Settings**: Configure scaffold templates
- **Project Elevation Settings**: Configure project folder structure
- **Dashboard Settings**: Customize dashboard view and filters
- **Clustering Settings**: Configure clustering algorithms and visualization
- **Resurfacing Settings**: Configure weekly digest and resurfacing
- **Capture Modal Settings**: Customize keyboard shortcuts for Save and Ideate buttons
- **Error Logging**: Configure error tracking and reporting

## Usage

### Capturing an Idea

1. Press your configured hotkey (default: `Cmd/Ctrl + I`) or click the lightbulb icon
2. Type your idea in the modal
3. Choose your capture method:
   - **Save Button** (⌘ Enter / Ctrl+Enter): Saves the raw idea text as-is
   - **Ideate Button** (⌥ Enter / Alt+Enter): Saves and automatically processes with AI:
     - Auto-classifies with category and tags
     - Generates a title/subject line
     - Expands with related ideas, questions, and next steps
     - All in one action!
4. Ideatr automatically:
   - Creates a markdown file in `Ideas/`
   - Classifies the idea (if auto-classify is enabled or using Ideate)
   - Suggests tags and categories
   - Checks for duplicates
   - Validates domain names (if applicable)
   - Generates name variants (if enabled)

**Pro Tip**: Use the **Ideate** button for ideas you want to immediately enrich with AI processing. Use **Save** for quick raw capture that you'll process later. Keyboard shortcuts are customizable in Settings → Capture Modal, and tooltips show the shortcuts when you hover over the buttons.

### Idea File Structure

Each idea is saved as a markdown file with structured frontmatter:

```yaml
---
type: idea
status: captured
created: 2025-01-15
category: SaaS
tags: [productivity, tool, automation]
related: [["Related Idea 1", "path/to/idea1.md"]]
domains: [ideatr.com, ideatr.io]
existence-check: ["Found similar product: X"]
codename: PROJECT_ALPHA
---
Your idea text goes here...
```

### Available Commands

#### Capture
- **Capture Idea**: Open the quick capture modal

#### Validation
- **Check Domains**: Validate domain name availability
- **Search Existence**: Web search to check if idea exists
- **Check Duplicates**: Find similar ideas in your vault
- **Find Related Notes**: Discover related ideas
- **Quick Validate**: Run all validation checks

#### Transformation
- **Generate Name Variants**: Create name variations
- **Generate Scaffold**: Create structured templates
- **Generate Mutations**: Generate idea variations
- **Expand Idea**: Expand brief ideas into detailed descriptions
- **Reorganize Idea**: Restructure idea content

#### Lifecycle
- **Change Status**: Update idea status
- **Archive Idea** / **Unarchive Idea**: Archive management
- **Generate Codename**: Create memorable codenames

#### Views
- **Open Dashboard**: Open the dashboard view
- **Open Graph View**: Open the graph visualization

#### Management
- **Classify Current Note**: Classify an existing note
- **Refresh Idea**: Update classification and metadata
- **Export Ideas**: Export to JSON/CSV
- **Import Ideas**: Import from external sources
- **Generate Weekly Digest**: Create resurfacing digest
- **Elevate to Project**: Promote idea to project

#### Batch Operations
- **Reclassify All Ideas**: Update all classifications
- **Find All Duplicates**: Comprehensive duplicate detection
- **Refresh All Related Notes**: Update all relationships

#### Analysis
- **Find Tenuous Links**: Discover unexpected connections
- **Analyze Idea Cluster**: Deep dive into clusters
- **Show Idea Statistics**: View collection statistics

### Elevating an Idea to a Project

1. Open an idea file
2. Use the **"Elevate to Project"** command
3. Ideatr:
   - Moves the file from `Ideas/` to `Projects/`
   - Creates starter folder structure
   - Prepares Devra-friendly metadata (`.devra.json`)
   - Updates idea status to "elevated"

## Project Structure

```
/obsidian-ideatr
  ├── src/                    # TypeScript source code
  │   ├── main.ts            # Plugin entry point
  │   ├── capture/           # Capture modal components
  │   ├── commands/           # Command implementations
  │   │   ├── analysis/      # Analysis commands
  │   │   ├── batch/         # Batch operation commands
  │   │   ├── capture/       # Capture commands
  │   │   ├── lifecycle/     # Lifecycle management
  │   │   ├── management/    # Management commands
  │   │   ├── transformation/# Transformation commands
  │   │   ├── validation/    # Validation commands
  │   │   └── views/         # View commands
  │   ├── core/              # Core plugin infrastructure
  │   ├── metadata/          # Frontmatter handling
  │   ├── services/          # Business logic services
  │   │   ├── providers/     # LLM provider implementations
  │   │   └── ...            # Various services
  │   ├── settings/          # Settings UI components
  │   ├── storage/           # File management
  │   ├── types/             # TypeScript type definitions
  │   ├── utils/             # Utility functions
  │   └── views/             # View components and modals
  ├── binaries/              # Bundled llama-server binaries
  │   └── darwin-arm64/      # Platform-specific binaries
  ├── test/                  # Test suite
  │   ├── unit/              # Unit tests
  │   ├── compatibility/    # Compatibility tests
  │   └── mocks/             # Test mocks
  ├── styles.css             # Plugin styles
  ├── manifest.json          # Obsidian plugin manifest
  ├── package.json           # Dependencies and scripts
  ├── tsconfig.json          # TypeScript configuration
  ├── vitest.config.ts       # Test configuration
  ├── esbuild.config.mjs     # Build configuration
  └── README.md              # This file
```

## Architecture

### Core Principles
- **Local-First**: Obsidian vault is the source of truth. All data = markdown + frontmatter
- **Plugin Architecture**: TypeScript, Obsidian Plugin API. No backend required
- **Service-Oriented**: Modular service architecture for maintainability
- **Provider Pattern**: Extensible LLM provider system
- **Command Pattern**: All actions are commands for consistency
- **No Lock-In**: Markdown only, fully portable

### Key Components

- **PluginContext**: Central context object providing access to all services
- **ServiceInitializer**: Initializes and wires all services
- **CommandRegistry**: Centralized command registration
- **HybridLLM**: Manages local and cloud AI with smart fallback
- **IdeaRepository**: Abstraction for idea file operations
- **ClassificationService**: AI-powered classification
- **ClusteringService**: Idea relationship detection
- **DuplicateDetector**: Similarity detection
- **NameVariantService**: Name generation with caching
- **ProjectElevationService**: Project promotion logic

### Integration Points
- **Devra** (optional): Project elevation and metadata
- **Prospectr** (optional): Domain checking service
- **Web Search APIs**: Google Custom Search, DuckDuckGo

## Development

### Development Guidelines

- Follow TypeScript best practices
- Use Obsidian Plugin API conventions
- Write tests for new features (unit tests in `test/unit/`)
- Update PRD and task-list.md when adding features
- Keep UI minimal and non-intrusive
- Use magic commit format for commits

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building

```bash
# Production build
npm run build

# Development build with watch
npm run dev
```

### Code Quality

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Make your changes following the project's coding standards
4. Write tests for new features
5. Test thoroughly in Obsidian
6. Commit changes aligning with project commit format
7. Push to the branch (`git push origin feature/new-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Obsidian Plugin API conventions
- Write tests for new features
- Update PRD and task-list.md when adding features
- Keep UI minimal and non-intrusive
- Use project commit format for commits

## Roadmap

### Current Version: 0.8.5

**Implemented Features:**
- ✅ Core capture and classification
- ✅ **Ideate Button** - One-click AI-powered idea processing and enrichment
- ✅ Multi-provider AI support (local + cloud)
- ✅ Validation tools (domains, existence, duplicates)
- ✅ Transformation tools (variants, scaffolds, mutations)
- ✅ Dashboard and Graph views
- ✅ Batch operations
- ✅ Analysis tools
- ✅ Import/Export
- ✅ Project elevation
- ✅ Weekly digest/resurfacing
- ✅ Customizable keyboard shortcuts with tooltips

### Future Enhancements

- **v0.9+**: Enhanced mobile experience
- **v1.0**: Background enrichment and auto-updates
- **v1.1+**: Voice capture support
- **v2.0+**: Advanced clustering algorithms
- **v2.0+**: Collaborative features

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

## Related Projects (coming soon(tm))

- **Devra**: Downstream project management and execution tool
- **Prospectr**: Domain checking and availability service

---
