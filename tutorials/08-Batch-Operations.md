# Batch Operations

Batch operations let you process multiple ideas at once, saving time and ensuring consistency.

## Overview

Ideatr provides three batch operations:
- **Reclassify All Ideas** - Update AI enhancement (category, tags) for all ideas
- **Find All Duplicates** - Comprehensive duplicate detection
- **Refresh All Related Notes** - Update relationship links

## When to Use Batch Operations

**Use batch operations when:**
- You've changed AI models or providers
- You want to update all idea enhancements
- You're cleaning up your vault
- You want to refresh relationships
- You're doing a comprehensive audit

**Don't use batch operations:**
- For individual ideas (use single-idea commands)
- When you only need to process a few ideas
- When you want immediate results (batch operations can take time)

## Reclassify All Ideas

**What it does:** Updates classification (category, tags) and related notes for all ideas using current AI settings.

**When to use:**
- You've changed AI models or providers
- You want to update classifications with better models
- You've improved classification prompts
- You want consistent classification across all ideas

**How to use:**
1. Use **"Reclassify All Ideas"** command
2. Confirm operation (shows number of ideas)
3. Progress modal shows progress
4. Results are saved to each idea's frontmatter

**What it updates:**
- Category classification
- Tag suggestions
- Related notes (if enabled)
- Classification metadata

**Time considerations:**
- Can take time for large vaults
- Progress is shown in modal
- Can be cancelled if needed

## Find All Duplicates

**What it does:** Comprehensive duplicate detection across entire vault.

**When to use:**
- You want to find all duplicate ideas
- You're cleaning up your vault
- You suspect duplicates exist
- You want to consolidate similar ideas

**How to use:**
1. Use **"Find All Duplicates"** command
2. Progress modal shows scanning progress
3. Results modal shows duplicate pairs
4. Review and decide on actions:
   - Merge duplicates
   - Link related ideas
   - Keep separate

**What it finds:**
- Exact duplicates
- Near-duplicates (high similarity)
- Similar ideas (configurable threshold)

**Results:**
- List of duplicate pairs
- Similarity scores
- Options to merge or link

## Refresh All Related Notes

**What it does:** Updates relationship links for all ideas.

**When to use:**
- You've added new ideas
- You want to refresh relationships
- You've changed clustering settings
- You want to update related notes

**How to use:**
1. Use **"Refresh All Related Notes"** command
2. Progress modal shows progress
3. Relationships are updated
4. Results are saved to each idea's frontmatter

**What it updates:**
- Related notes links
- Relationship metadata
- Clustering information

**Time considerations:**
- Can take time for large vaults
- Progress is shown in modal
- Can be cancelled if needed

## Batch Operation Workflow

### Recommended Workflow

1. **Backup your vault** (recommended before batch operations)
2. **Choose operation** based on your needs
3. **Review progress** in progress modal
4. **Review results** in results modal
5. **Take action** (merge, link, etc.)

### When to Run Batch Operations

**Regular maintenance:**
- Monthly: Refresh related notes
- Quarterly: Find all duplicates
- After model changes: Reclassify all

**One-time operations:**
- After major vault changes
- After importing ideas
- After changing settings

## Best Practices

### Before Running

1. **Backup your vault** - Batch operations modify many files
2. **Review settings** - Ensure AI and clustering settings are correct
3. **Check available resources** - Batch operations can be resource-intensive
4. **Plan timing** - Run during low-activity periods

### During Operation

1. **Monitor progress** - Watch progress modal
2. **Don't interrupt** - Let operations complete
3. **Review results** - Check results carefully
4. **Take action** - Merge, link, or keep separate

### After Operation

1. **Review changes** - Check updated ideas
2. **Verify results** - Ensure operations worked correctly
3. **Clean up** - Remove duplicates, consolidate ideas
4. **Document** - Note what was done

## Settings

Configure batch operations in **Settings → Ideatr**:
- **Clustering Settings** - Affects duplicate detection and related notes
- **AI Settings** - Affects reclassification
- **Timeout Settings** - Configure operation timeouts

## Tips

- **Run during off-hours** - Batch operations can take time
- **Backup first** - Always backup before batch operations
- **Review results** - Don't blindly accept all results
- **Use filters** - Filter results to focus on specific ideas
- **Take breaks** - Large operations can be overwhelming

## Related Guides

- **Dashboard Guide** → See [[06-Dashboard-Guide|Dashboard Guide]]
- **Advanced Features** → See [[09-Advanced-Features|Advanced Features Guide]]
- **Lifecycle Management** → See [[05-Lifecycle-Management|Lifecycle Management Guide]]

---

*Tip: Use batch operations for comprehensive vault maintenance, but use single-idea commands for day-to-day work.*

