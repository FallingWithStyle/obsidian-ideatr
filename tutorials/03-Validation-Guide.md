# Validation Guide

Validation helps you verify and refine your ideas before investing more time in them.

## What is Validation?

Validation is the process of checking whether your idea is viable, unique, and worth pursuing. Ideatr provides several validation tools:

1. **Domain Checking** - Check if domain names are available
2. **Existence Search** - Search the web to see if similar products exist
3. **Duplicate Detection** - Find similar ideas already in your vault
4. **Related Notes Discovery** - Find and link related ideas

## Validation Tools

### Domain Checking

**When to use:**
- Your idea involves a product or service that needs a domain name
- You want to check domain availability before proceeding

**How to use:**
1. Open an idea file
2. Use **"Check Domains"** command
3. Ideatr extracts domain names from your idea text
4. Results are saved to the idea's frontmatter

**Settings:**
- Enable/disable in **Settings → Ideatr → Domain Settings**
- Auto-check on capture (optional)
- Configure Prospectr integration (if available)

### Existence Search

**When to use:**
- You want to know if similar products/services already exist
- You're researching the competitive landscape
- You want to validate market need

**How to use:**
1. Open an idea file
2. Use **"Search Existence"** command
3. Ideatr searches the web for similar products
4. Results are saved to the idea's frontmatter

**Settings:**
- Enable/disable in **Settings → Ideatr → Web Search Settings**
- Choose provider (Google, DuckDuckGo)
- Configure API keys (for Google Custom Search)
- Auto-search on capture (optional)

### Duplicate Detection

**When to use:**
- You want to avoid creating duplicate ideas
- You're consolidating similar concepts
- You want to find related ideas in your vault

**How to use:**
1. Open an idea file
2. Use **"Check Duplicates"** command
3. Ideatr finds similar ideas using semantic similarity
4. Review results and decide whether to merge or link ideas

**How it works:**
- Uses embedding-based similarity detection
- Compares idea content and metadata
- Shows similarity scores

### Related Notes Discovery

**When to use:**
- You want to find connections between ideas
- You're building a knowledge graph
- You want to see related concepts

**How to use:**
1. Open an idea file
2. Use **"Find Related Notes"** command
3. Ideatr finds semantically similar ideas
4. Links are added to the idea's frontmatter

**How it works:**
- Uses embedding-based similarity
- Finds ideas with similar content or themes
- Creates bidirectional links

### Quick Validate

**When to use:**
- You want to run all validation checks at once
- You're doing a comprehensive validation pass
- You want to validate multiple aspects quickly

**How to use:**
1. Open an idea file
2. Use **"Quick Validate"** command
3. Ideatr runs all enabled validation checks
4. Results are saved to the idea's frontmatter

## Validation Workflow

### Recommended Workflow

1. **Capture** your idea (Save or Ideate)
2. **Quick Validate** to run all checks
3. **Review results** in the idea's frontmatter
4. **Decide next steps:**
   - If domain unavailable → Consider alternatives or variants
   - If similar products exist → Research differentiation
   - If duplicates found → Merge or consolidate
   - If related notes found → Review and link

### When to Validate

- **Before investing time**: Validate early to avoid wasted effort
- **After capture**: Quick validate immediately after capturing
- **Before elevation**: Validate before promoting to project
- **Periodically**: Re-validate ideas as they evolve

## Settings

Configure validation in **Settings → Ideatr**:
- **Domain Settings**: Enable domain checking, configure auto-check
- **Web Search Settings**: Enable search, configure providers and API keys
- **Validation behavior**: Auto-run on capture (optional)

## Related Guides

- **Capture Workflows** → See [[02-Capture-Workflows|Capture Workflows Guide]]
- **Transformation Tools** → See [[04-Transformation-Tools|Transformation Tools Guide]]
- **Lifecycle Management** → See [[05-Lifecycle-Management|Lifecycle Management Guide]]

---

*Tip: Use Quick Validate to run all checks at once and get a comprehensive view of your idea's viability.*

