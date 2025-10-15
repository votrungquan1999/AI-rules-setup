# ADR-005: Always-Fetch-Latest Strategy (No Caching/Versioning for MVP)

## Status

Accepted

## Context

We need to decide how the CLI should handle rule updates and caching. The options are:

1. Always fetch latest from GitHub (no caching)
2. Cache rules locally with periodic updates
3. Version pinning with lockfiles
4. Hybrid approach

## Decision

We will use an **always-fetch-latest strategy** for the MVP, with no local caching or version pinning.

## Rationale

### Always-Fetch-Latest Benefits

- **Simplicity**: No complex caching logic to implement
- **Always Current**: Users always get the latest rules
- **No Storage**: No local storage requirements
- **Easy to Implement**: Straightforward GitHub API calls
- **Predictable**: Users know they're getting the latest

### Alternative Considered: Local Caching

**Pros:**

- Faster subsequent runs
- Works offline
- Reduces GitHub API calls

**Cons:**

- Complex cache invalidation
- Storage management
- Stale data issues
- More code to maintain

### Alternative Considered: Version Pinning

**Pros:**

- Reproducible builds
- No surprise changes
- Better for CI/CD

**Cons:**

- Complex version management
- Need to update versions manually
- More configuration
- Overkill for MVP

### Alternative Considered: Hybrid Approach

**Pros:**

- Best of both worlds
- Flexible for different use cases

**Cons:**

- Most complex to implement
- Harder to understand
- More configuration options

## Implementation

### GitHub API Usage

```typescript
async function fetchRuleFile(agent: string, category: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/org/ai-rules/main/rules/${agent}/${category}/rules.md`
  const response = await fetch(url)
  return await response.text()
}
```

### No Local Storage

- No `.ai-rules-cache` directory
- No version tracking in config
- No offline mode

### Update Command

```bash
ai-rules update  # Always fetches latest
```

## Consequences

### Positive

- Simple implementation
- Always current rules
- No storage management
- Easy to understand
- Fast to develop

### Negative

- Requires internet connection
- Slower than cached approach
- More GitHub API calls
- No offline support
- Potential for breaking changes

## Future Considerations

### Iteration 4+: Version Pinning

Add version pinning as an advanced feature:

```bash
ai-rules update --pin-to-commit abc123
ai-rules update --pin-to-tag v1.2.3
```

### Iteration 4+: Local Caching

Add local caching for performance:

```bash
ai-rules update --use-cache
ai-rules cache clear
```

### Iteration 4+: Lockfiles

Add lockfile support for reproducible builds:

```json
{
  "rules": [
    {
      "id": "typescript-strict",
      "commit": "abc123",
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Error Handling

### Network Failures

- Clear error messages
- Retry with exponential backoff
- Suggest checking internet connection

### GitHub API Limits

- Handle rate limiting gracefully
- Show helpful error messages
- Suggest waiting before retrying

### Invalid Responses

- Validate response format
- Handle 404 errors for missing rules
- Provide helpful error messages

## Performance Considerations

### Network Latency

- Use GitHub's CDN (raw.githubusercontent.com)
- Consider parallel requests for multiple files
- Show progress indicators for long operations

### API Rate Limits

- GitHub allows 60 requests/hour for unauthenticated requests
- Consider authentication for higher limits
- Batch requests where possible

## Related ADRs

- ADR-001: TypeScript CLI implementation
- ADR-006: Conflict detection strategy
