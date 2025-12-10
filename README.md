# Ideatr

A powerful, Obsidian-native "idea intake + triage + transform + validate" tool. Fast capture, AI-powered idea enhancement, and comprehensive idea management.

## Overview

Ideatr is a comprehensive idea management system for Obsidian that captures ideas quickly, enhances them intelligently using AI, clusters related concepts, deduplicates similar ideas, validates domains and existence, generates variants and scaffolds, and prepares ideas for project elevation. In short, it lets you save ideas quickly, and (optionally) enhance them easily.

**Problem**: Creative professionals, entrepreneurs, and knowledge workers generate a large volume of ideas across many domains. These ideas often live in fragmented systems (chat logs, fleeting notes, various apps), causing low retrieval rates, duplicate effort, and missed connections.

**Solution**: Ideatr provides a single, intelligent "front door" for ideas with automatic AI enhancement, validation tools, clustering, and seamless integration with your Obsidian vault.

### Current Version: 0.9.2

Ideatr v0.9.2 focuses on cloud AI providers (Anthropic, OpenAI, Google Gemini, Groq, OpenRouter) and continues to receive regular updates. Local AI functionality has been removed in favor of cloud providers for better reliability and performance.

For users interested in local AI, keep an eye out for the upcoming **Ideatr Desktop App**, which will include:
- Local AI with ongoing updates and support
- Native performance
- System-wide hotkey support
- Complete privacy

[Learn more about the Desktop App →](https://ideatr.app/desktop)

## Features

### Core Capture & AI Enhancement
- **Quick Capture Modal**: Universal hotkey opens a lightweight modal anywhere in Obsidian for fast idea capture (<10 seconds)
- **Ideate Button**: One-click AI-powered idea processing! The gold "Ideate" button automatically:
  - Saves your raw idea text
  - Enhances with category and tags
  - Generates a concise title/subject line
  - Expands the idea with related concepts, questions, and next steps
  - All in one action - perfect for rapid idea capture and enrichment
- **Automatic File Creation**: Ideas automatically create markdown files in `Ideas/` directory with structured frontmatter
- **AI Idea Enhancement**: Multi-provider LLM-powered classification (categorization, tag suggestions), expansion, and related note detection
- **Customizable Keyboard Shortcuts**: Configure your own keyboard shortcuts for Save and Ideate buttons (with tooltips showing shortcuts on hover)
- **First-Launch Setup**: Guided setup wizard for configuring AI models and providers
### AI Providers
- **Cloud AI**: Support for multiple providers:
  - Anthropic (Claude)
  - OpenAI (GPT-4, GPT-3.5)
  - Google Gemini
  - Groq
  - OpenRouter (access to 100+ models)
  - Custom endpoints (Ollama, self-hosted, etc.)

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
- **Project Elevation**: Promote ideas to full projects with folder structure and project metadata (planned expansion for project management integration)

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
   - `tutorials/` folder (includes all tutorial documentation)
3. Reload Obsidian or restart the app
4. Enable the plugin in **Settings → Community Plugins → Installed plugins**
5. Configure your AI provider in **Settings → Ideatr**
6. Tutorials will be automatically copied to your vault on first launch

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

# Package for release (creates a zip file with all necessary files)
npm run package
```

### First Launch Setup

On first launch, Ideatr will guide you through:
1. **AI Provider Selection**: Choose from cloud AI providers
2. **Model Configuration**: Enter API keys for your chosen provider(s)
3. **Feature Preferences**: Configure which features to enable/disable
4. **Directory Setup**: Verify or configure idea storage directories

### Configuration

Access settings via **Obsidian Settings → Ideatr**:

- **Cloud AI Settings**: Set up API keys for cloud providers
- **Domain Settings**: Configure domain checking (planned expansion for domain checking service)
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
   - **Save Button** (⌥ Enter / Alt+Enter): Saves the raw idea text as-is
   - **Ideate Button** (⌘ Enter / Ctrl+Enter): Saves and automatically processes with AI:
     - Auto-classifies with category and tags
     - Generates a title/subject line
     - Expands with related ideas, questions, and next steps
     - All in one action!
4. Ideatr automatically:
   - Creates a markdown file in `Ideas/`
   - Classifies and enhances the idea with AI (if auto-enhancement is enabled or using Ideate)
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
- **Classify Current Note**: Classify and enhance an existing note with AI (category, tags, related notes)
- **Refresh Idea**: Update AI enhancement and metadata
- **Export Ideas**: Export to JSON/CSV
- **Import Ideas**: Import from external sources
- **Generate Weekly Digest**: Create resurfacing digest
- **Elevate to Project**: Promote idea to project

#### Batch Operations
- **Reclassify All Ideas**: Update classification and enhancement for all ideas
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
   - Prepares project metadata (`.devra.json`) for future project management integrations
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
- **ClassificationService**: AI-powered classification and idea enhancement
- **ClusteringService**: Idea relationship detection
- **DuplicateDetector**: Similarity detection
- **NameVariantService**: Name generation with caching
- **ProjectElevationService**: Project promotion logic

### Integration Points
- **Project Management Integration** (planned): Project elevation and metadata for downstream project management tools
- **Domain Checking Service** (planned): Domain availability checking service integration
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

### Current Version: 0.9.2

**Implemented Features:**

#### Core Capture & Enhancement
- ✅ Quick capture modal with universal hotkey
- ✅ **Ideate Button** - One-click AI-powered idea processing and enrichment
- ✅ Automatic file creation with structured frontmatter
- ✅ AI-powered classification (category, tags, related notes)
- ✅ First Launch Setup wizard for guided configuration
- ✅ Customizable keyboard shortcuts with tooltips

#### AI Providers
- ✅ Multi-provider cloud AI support
- ✅ Cloud AI: Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, custom endpoints

#### Validation Tools
- ✅ Domain availability checking
- ✅ "Does This Exist?" web search integration
- ✅ Duplicate detection with similarity scoring
- ✅ Related notes discovery
- ✅ Quick Validate (runs all validation checks)

#### Transformation Tools
- ✅ Name variant generation (synonyms, short names, domain hacks, phonetic variants)
- ✅ Scaffold generation (templates for different idea types)
- ✅ Idea expansion (brief → detailed descriptions)
- ✅ Idea mutations (generate variations and alternatives)
- ✅ Idea reorganization (restructure content)
- ✅ Guided Ideation (interactive transformation workflow)

#### Lifecycle Management
- ✅ Status management (captured → validated → promoted → archived)
- ✅ Archive/Unarchive functionality
- ✅ Codename generation
- ✅ **Project Elevation** - Promote ideas to full projects with folder structure and metadata

#### Views & Visualization
- ✅ Dashboard view with advanced filtering, sorting, and pagination
- ✅ Graph view with interactive visualization and layout algorithms
- ✅ Clusters mini-graph in dashboard
- ✅ Resurfacing panel for old ideas
- ✅ Triage inbox for unclassified ideas

#### Analysis & Insights
- ✅ Idea statistics and collection overview
- ✅ Cluster analysis (deep dive into relationships)
- ✅ Tenuous links discovery (unexpected connections)
- ✅ Weekly digest (automated resurfacing of old ideas)

#### Batch Operations
- ✅ Reclassify all ideas
- ✅ Find all duplicates (comprehensive vault-wide detection)
- ✅ Refresh all related notes (update all relationships)

#### Management & Organization
- ✅ Import/Export (JSON, CSV formats)
- ✅ Classify current note (enhance existing notes)
- ✅ Refresh idea (update AI enhancement and metadata)
- ✅ Tutorials system (built-in documentation)
- ✅ Error logging and debug features

### Future Enhancements

#### v0.9+ - Mobile & Polish
- Enhanced mobile experience for Obsidian mobile
- Improved touch interactions
- Mobile-optimized capture modal

#### v1.0 - Automation & Efficiency
- Background enrichment and auto-updates
- Smart notifications for old ideas and validation needs
- Idea templates (pre-configured idea types with scaffolds)

#### v1.1+ - Advanced Capture
- Voice capture support
- Enhanced import from external sources
- Bulk capture workflows

#### v1.2+ - Integrations
- **Project Management Integration** - Enhanced `.devra.json` support and integration with external project management tools
- **Domain Checking Service Integration** - Enhanced domain availability checking with service integration
- Export to project management tools (Linear, Jira, etc.)

#### v2.0+ - Advanced Features
- Advanced clustering algorithms (improved relationship detection)
- Collaborative features (shared idea vaults, team workflows)
- Real-time sync and collaboration

## Support

- **GitHub Issues**: Report bugs, request features, or ask questions at [https://github.com/FallingWithStyle/obsidian-ideatr/issues](https://github.com/FallingWithStyle/obsidian-ideatr/issues)
- **Author**: Patrick A Regan <ideatr@paraphlabs.com> ([@FallingWithStyle](https://github.com/FallingWithStyle))

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Obsidian for the excellent plugin API
- The Obsidian community for inspiration and support
- All AI provider APIs (Anthropic, OpenAI, Google, Groq, OpenRouter)

## Related Projects (coming soon(tm))

- **Project Management Tool**: Downstream project management and execution tool (planned expansion)
- **Domain Checking Service**: Domain checking and availability service (planned expansion)

---
