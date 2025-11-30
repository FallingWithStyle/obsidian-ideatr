# Ideatr

A lightweight, Obsidian-native "idea intake + triage + transform + validate" tool. Day-1 usable. Future-expandable. No dependencies.

## Overview

Ideatr is the central intake and triage layer for all creative ideas — a small but powerful Obsidian plugin that captures ideas quickly, classifies them intelligently, clusters related ideas, deduplicates similar concepts, validates ("does this exist?", domains, names), generates variants and scaffolds, and prepares ideas for "real project" elevation.

**Problem**: You generate a large volume of creative, entrepreneurial, narrative, and mechanic ideas across many domains. These ideas currently live in mixed systems (chat logs, fleeting notes, Obsidian, Notion, random text files), causing fragmentation, low retrieval rate, duplicate effort, and missed connections.

**Solution**: Ideatr provides a single lightweight "front door" for ideas with intelligent auto-classification, validation tools, and seamless integration with your Obsidian vault.

## Features

### v0 Features (Current)
- **Quick Capture Modal**: Universal hotkey opens a lightweight modal anywhere in Obsidian for <10 second idea capture
- **Automatic File Creation**: Ideas automatically create markdown files in Ideas/ directory with structured frontmatter
- **AI Auto-Classification**: LLM-powered categorization, tag suggestions, and related note detection
- **Domain Availability Check**: Quick domain name validation (local or API)
- **"Does This Exist?" Search**: Lightweight web search to check if ideas already exist
- **Name Variant Generator**: Generate synonyms, short names, domain hacks, and phonetic variants
- **Duplicate Detection**: Warns about similar ideas to prevent redundancy

### v1 Features (Planned)
- **Dashboard View**: Table view of ideas with filters, search, and visualization
- **Idea Clustering**: Graph layout showing relationships between ideas
- **Weekly Resurfacing**: Automated digest of old ideas to prevent forgetting
- **Scaffold Generator**: Templates for different idea types (project, game mechanic, narrative seed, etc.)
- **Project Elevation**: Promote ideas to full projects with folder structure

## Getting Started

### Prerequisites
- Obsidian installed and running
- TypeScript development environment (for development)
- Optional: Local LLM or API access for AI classification
- Optional: Prospectr (for enhanced domain validation)
- Optional: Devra (for project elevation integration)

### Installation

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
```

### Setup in Obsidian

1. Copy the plugin files to your Obsidian vault's `.obsidian/plugins/ideatr/` directory
2. Enable the plugin in Obsidian Settings → Community Plugins
3. Configure hotkey in Obsidian Settings → Hotkeys (search for "Ideatr: Capture Idea")
4. Create or use existing `Ideas/` directory in your vault

## Usage

### Capturing an Idea

1. Press your configured hotkey (default: `Cmd/Ctrl + I`)
2. Type your idea in the modal
3. Press Enter to save
4. Ideatr automatically:
   - Creates a markdown file in Ideas/
   - Classifies the idea
   - Suggests tags
   - Checks for duplicates
   - Validates domain names (if applicable)
   - Generates name variants

### Idea File Structure

Each idea is saved as a markdown file with frontmatter:

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
---
Your idea text goes here...
```

### Elevating an Idea to a Project

1. Open an idea file
2. Use the "Elevate to Project" command
3. Ideatr moves the file from Ideas/ to Projects/
4. Creates starter folder structure
5. Prepares Devra-friendly metadata (if Devra is available)

## Project Structure

```
/obsidian-ideatr
  ├── src/              # TypeScript source code
  │   ├── main.ts       # Plugin entry point
  │   ├── capture/      # Capture modal components
  │   ├── classification/ # AI classification logic
  │   ├── validation/   # Domain and existence checks
  │   ├── transformation/ # Name variants and scaffolds
  │   └── utils/        # Utility functions
  ├── styles.css        # Plugin styles
  ├── manifest.json     # Obsidian plugin manifest
  ├── package.json      # Dependencies and scripts
  ├── tsconfig.json     # TypeScript configuration
  ├── README.md         # This file
  ├── PRD.md            # Product Requirements Document
  └── task-list.md      # Development task list
```

## Architecture

- **Storage**: Obsidian vault is the database. All data = markdown + frontmatter.
- **Plugin Architecture**: TypeScript, Obsidian Plugin API. No backend required.
- **Integration Points**: 
  - Prospectr (optional): Domain checks, name availability, competitor existence
  - Devra (optional): Project elevation and metadata
- **Local-First**: Works offline (except validation APIs). No lock-in.

## Guiding Principles

- **Local-first**: Obsidian vault is the source of truth
- **Minimal UI, maximum leverage**: Fast capture, slow editing
- **No dependencies**: Works standalone, optional integrations only
- **Avoid lock-in**: Markdown only, fully portable
- **Small, calm, invisible until needed**

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Make your changes following the project's coding standards
4. Test thoroughly in Obsidian
5. Commit changes using magic commit format (`git commit -m 'feat: Add new feature'`)
6. Push to the branch (`git push origin feature/new-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Obsidian Plugin API conventions
- Write tests for new features
- Update PRD and task-list.md when adding features
- Keep UI minimal and non-intrusive

## Roadmap

- **Phase 0: Prototype** (Current)
  - Basic capture modal
  - Frontmatter structure testing
  
- **Phase 1: MVP (v0)** (Q1 2025)
  - All v0 features functional
  - Basic settings panel
  
- **Phase 2: v1** (Q2 2025)
  - Dashboard view
  - Clustering and visualization
  - Weekly resurfacing
  
- **Phase 3: v2+** (Future)
  - Mobile experience improvements
  - Background enrichment
  - Voice capture

## Support

- **GitHub Issues**: Report bugs, request features, or ask questions at [https://github.com/FallingWithStyle/obsidian-ideatr/issues](https://github.com/FallingWithStyle/obsidian-ideatr/issues)
- **Author**: Patrick A Regan <ideatr@paraphlabs.com> ([@FallingWithStyle](https://github.com/FallingWithStyle))

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Obsidian for the excellent plugin API
- The Obsidian community for inspiration and support
- [Add other credits as needed]

## Related Projects

- **Prospectr**: Outward-facing validation tool (domains, search, competitors)
- **Devra**: Downstream project management and execution tool

---

For detailed requirements and specifications, see [PRD.md](./PRD.md).  
For development tasks and progress tracking, see [task-list.md](./task-list.md).

