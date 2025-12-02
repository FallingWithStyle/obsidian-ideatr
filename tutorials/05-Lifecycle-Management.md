# Lifecycle Management

Manage your ideas through their complete lifecycle from capture to project elevation.

## Idea Lifecycle

Ideas progress through several stages:

1. **Captured** - Initial capture (default status)
2. **Validated** - Validation checks completed
3. **Promoted** - Idea is ready for development
4. **Archived** - Idea is no longer active

## Status Management

### Changing Status

**How to change status:**
1. Open an idea file
2. Use **"Change Status"** command
3. Select new status from picker
4. Status is updated in frontmatter

**Status options:**
- **Captured** - Initial state
- **Validated** - Validation complete
- **Promoted** - Ready for development
- **Archived** - No longer active

### Status Workflow

**Recommended workflow:**
1. **Capture** → Idea is created with "captured" status
2. **Validate** → Run validation checks, change to "validated"
3. **Promote** → After validation and transformation, change to "promoted"
4. **Archive** → When idea is no longer relevant, archive it

## Archiving Ideas

### Archive an Idea

**When to archive:**
- Idea is no longer relevant
- Idea has been superseded
- Idea is on hold indefinitely
- You want to clean up your active ideas

**How to archive:**
1. Open an idea file
2. Use **"Archive Idea"** command
3. Idea status changes to "archived"
4. Idea may be moved to `Ideas/Archived/` (if enabled in settings)

### Unarchive an Idea

**When to unarchive:**
- You want to revisit an archived idea
- Idea becomes relevant again
- You want to reactivate an idea

**How to unarchive:**
1. Open an archived idea file
2. Use **"Unarchive Idea"** command
3. Idea status changes back to previous status
4. Idea is moved back to `Ideas/` (if it was moved)

**Settings:**
- Enable/disable moving archived ideas to `Ideas/Archived/` folder
- Configure in **Settings → Ideatr → File Organization**

## Codename Generation

**What it does:** Generates memorable codenames for your ideas.

**When to use:**
- You want a memorable identifier
- You're working on multiple ideas and need quick references
- You want to keep ideas confidential
- You need project codenames

**How to use:**
1. Open an idea file
2. Use **"Generate Codename"** command
3. Review generated codename
4. Save codename to idea's frontmatter

**How it works:**
- Uses AI to generate memorable, relevant codenames
- Based on idea content and context
- Can regenerate if you don't like the first option

## Project Elevation

**What it does:** Promotes an idea to a full project with folder structure and metadata.

**When to elevate:**
- Idea is validated and ready for development
- You want to move from idea to project
- You need project structure and organization
- You're ready to start execution

**How to elevate:**
1. Open an idea file
2. Use **"Elevate to Project"** command
3. Ideatr:
   - Moves file from `Ideas/` to `Projects/`
   - Creates starter folder structure
   - Prepares project metadata (`.devra.json`) for future project management integrations
   - Updates idea status to "elevated"

**Settings:**
- Enable/disable in **Settings → Ideatr → Project Elevation Settings**
- Configure projects directory (default: `Projects/`)
- Configure default folders
- Enable project metadata creation (planned expansion for project management integration)

## Lifecycle Best Practices

### Organizing Ideas

1. **Keep active ideas visible** - Use Dashboard filters to show only active ideas
2. **Archive regularly** - Clean up ideas that are no longer relevant
3. **Use status consistently** - Follow the status workflow
4. **Elevate when ready** - Don't elevate too early, but don't wait too long

### Dashboard Workflow

1. **Triage inbox** - Review unclassified ideas
2. **Filter by status** - Focus on ideas at specific stages
3. **Use clusters** - See related ideas together
4. **Resurface old ideas** - Review ideas that haven't been touched

## Related Guides

- **Dashboard Guide** → See [[06-Dashboard-Guide|Dashboard Guide]]
- **Validation** → See [[03-Validation-Guide|Validation Guide]]
- **Transformation Tools** → See [[04-Transformation-Tools|Transformation Tools Guide]]

---

*Tip: Use status management to track your ideas through their lifecycle and keep your vault organized.*

