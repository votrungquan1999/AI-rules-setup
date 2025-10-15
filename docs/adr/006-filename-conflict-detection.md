# ADR-006: Conflict Detection on Filename Only

## Status

Accepted

## Context

When installing rules, we need to handle cases where files already exist. We need to decide:

1. What constitutes a "conflict"
2. How to detect conflicts
3. How to resolve conflicts

## Decision

We will detect conflicts based on **filename only** - if a file with the same name exists, it's a conflict.

## Rationale

### Filename-Only Detection Benefits

- **Simple Implementation**: Easy to check if file exists
- **Fast**: No need to read and compare file contents
- **Clear User Experience**: Users understand "file already exists"
- **Predictable**: Always the same behavior
- **Safe**: Won't accidentally overwrite user files

### Alternative Considered: Content-Based Detection

Compare file contents to determine if they're different.

**Pros:**

- More intelligent conflict detection
- Won't prompt for identical files
- Better user experience

**Cons:**

- More complex to implement
- Slower (need to read existing files)
- Need to handle encoding issues
- Harder to determine what constitutes "different"

### Alternative Considered: Timestamp-Based Detection

Check if the new file is newer than the existing file.

**Pros:**

- Can automatically update older files
- Reduces user prompts

**Cons:**

- Complex timestamp handling
- Not always reliable
- Harder to understand for users

### Alternative Considered: No Conflict Detection

Always overwrite existing files.

**Pros:**

- Simplest implementation
- No user prompts needed

**Cons:**

- Dangerous - can lose user changes
- Poor user experience
- Not safe for production

## Implementation

### Conflict Detection Logic

```typescript
function detectConflict(filePath: string): boolean {
  return fs.existsSync(filePath)
}
```

### Conflict Resolution

```typescript
async function resolveConflict(filePath: string): Promise<boolean> {
  const { overwrite } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'overwrite',
      message: `File ${filePath} already exists. Overwrite?`,
      default: false,
    },
  ])

  return overwrite
}
```

### User Experience

```
⚠️  Conflict detected: .cursor/rules/typescript-strict.md already exists
? Overwrite this file? (y/N)
```

## Consequences

### Positive

- Simple and fast
- Safe - won't lose user files
- Clear user experience
- Easy to implement and test
- Predictable behavior

### Negative

- May prompt for identical files
- Users need to make decisions
- Not as intelligent as content-based detection

## Edge Cases

### Identical Files

If the new file is identical to the existing file:

- Still prompt the user
- Could be optimized in the future
- For now, keep it simple

### Permission Errors

If we can't write to the file:

- Show clear error message
- Suggest checking permissions
- Don't treat as conflict

### Directory Creation

If the directory doesn't exist:

- Create it automatically
- Not a conflict situation
- Handle permission errors

## Future Enhancements

### Content Comparison (Iteration 3+)

Add content-based detection as an enhancement:

```typescript
function detectContentConflict(existingPath: string, newContent: string): boolean {
  const existingContent = fs.readFileSync(existingPath, 'utf8')
  return existingContent !== newContent
}
```

### Diff Display (Iteration 3+)

Show users what's different:

```typescript
function showDiff(existingPath: string, newContent: string): void {
  const existingContent = fs.readFileSync(existingPath, 'utf8')
  const diff = createDiff(existingContent, newContent)
  console.log(diff)
}
```

### Backup Creation (Iteration 3+)

Create backups before overwriting:

```typescript
function createBackup(filePath: string): string {
  const backupPath = `${filePath}.backup.${Date.now()}`
  fs.copyFileSync(filePath, backupPath)
  return backupPath
}
```

## Error Handling

### File System Errors

- Handle permission denied errors
- Handle disk space errors
- Handle path too long errors

### User Input Errors

- Handle invalid user responses
- Provide clear error messages
- Allow retry on errors

## Related ADRs

- ADR-004: Convention-based file renaming
- ADR-007: Config persistence strategy
