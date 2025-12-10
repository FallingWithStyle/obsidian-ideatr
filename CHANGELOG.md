# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.2] - 2025-12-10

### Added
- Tag normalization: tags are now normalized to single words or underscores for consistency

### Fixed
- Ideate command now properly handles expansion generation and preserves body content
- Added null checks for optional provider properties to prevent runtime errors
- Resolved all TypeScript linting errors in ProviderAdapter
- Improved provider detection by using provider name instead of instanceof checks
- Implemented complete() method for cloud providers to ensure proper cleanup
- Enabled browser mode for OpenAI and Anthropic providers in Electron environment
- Fixed return type for EditRelatedNotesCommand.executeWithFile

### Changed
- Streamlined idea processing and title generation for better performance

## [0.9.1] - 2025-12-08

### Added
- Enhanced cloud AI settings and updated tests
- Improved settings UI and first launch setup
- ID-based related field system for better idea relationships
- Updated management commands for ID-based related field
- Updated batch commands for ID-based related field
- Updated import/export services for ID-based related field
- Idea ID system infrastructure

### Changed
- Removed all local AI model functionality
- Improved LLM provider and model management
- Improved type safety and code quality across the codebase
- Upgraded ESLint to v9 and added Obsidian plugin
- Updated settings to use Obsidian Setting API
- Removed local AI services and process management utilities

### Fixed
- Improved promise handling and UI consistency in services
- Converted UI text to sentence case in views and settings
- Improved promise handling in commands and service initializer
- Improved promise handling in CaptureModal
- Resolved GBNF grammar parsing errors
- Resolved all TypeScript any types in source code
- Fixed remaining TypeScript compilation errors
- Prevented orphaned child processes by explicitly setting process options
- Replaced element.style.* with CSS classes
- Removed unnecessary async from methods without await
- Replaced confirm(), innerHTML, require(), and TFile casts

## [0.8.6] - 2025-12-03

### Added
- Alert notification when Ideate command fails
- Utility modules for process management and constants
- Process memory monitoring
- Cloud model validation and comparison utility
- Model parameter support to cloud providers
- Per-provider API key storage
- Custom Ideatr icons
- Beta notice to settings and tutorials
- Required integer id field to idea frontmatter
- Memory and process health monitoring utilities
- Enhanced logger with debug file support and rechecking
- Improved tutorial management with better file handling
- Singleton pattern for LlamaService with process health monitoring

### Changed
- Reorganized ServiceInitializer into focused methods
- Migrated LlamaService to use ProcessManager and constants
- Updated HybridLLM and prompts to use grammars and constants
- Standardized local and cloud model comparison formats
- Improved icon utilities and sizing
- Enhanced model management and tutorial system
- Aligned with Obsidian plugin guidelines
- Updated roadmap with comprehensive feature list

### Fixed
- Resolved TypeScript errors in FirstLaunchSetupModal test
- Resolved all remaining test failures
- Improved service algorithm tests
- Resolved Group 2 integration and initialization test failures
- Improved test mocks for modal and DOM infrastructure
- Enabled Groq client in browser-like environment
- Resolved TypeScript unused variable warnings
- Improved related notes accuracy and enhanced remaining prompts
- Improved LLM prompts and removed domain checking
- Improved JSON parsing and generation
- Removed process event handlers in onunload to prevent resource leak
- Fixed Enable Cloud AI toggle not working
- Resolved model loading and memory issues
- Fixed command execution, added visual indicators, and improved LLM timeout handling
- Logger now ignores dotfiles, uses vault adapter and async init
- Improved model status indicator UI and styling
- Integrated memory monitoring and improved plugin lifecycle

## [0.8.5] - 2025-11-30

### Added
- Feature request and bug report submission system
- Binary bundling support and enhanced JSON parsing with error handling
- Model auto-start on plugin load and manual start button
- Codename generation for ideas (fully automatic)
- Improved name variants and codename generation
- Optimized all LLM prompts
- Changed default idea filename format to [YYYY-MM-DD] Title.md
- Contact email to project metadata

### Changed
- Extracted command handlers and settings sections
- Enhanced UI components

### Fixed
- Handled missing LLM configuration gracefully in ensureReady
- Moved preload check after llmService initialization
- Abstracted LLM readiness behind ensureReady() method
- Resolved TypeScript error in server error handling
- Improved LLM server auto-start error handling and logging
- Improved error handling for codename generation
- Model download ETA calculation and integrity check
- Resolved all test failures
- Hid Prospectr references behind feature flag
