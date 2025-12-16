# Database Patterns

This document describes MongoDB operations, patterns, and repositories.

**Related Documentation:**
- [API Architecture](./api-architecture.md) - How database is used in API
- [Data Types](./data-types.md) - Database document types

## Database Connection

**Location:** `src/server/database.ts`

### Configuration

```typescript
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-rules-cache";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "ai-rules-cache";
```

### Connection Pool Settings

```typescript
{
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}
```

### Singleton Pattern

Single MongoDB client instance cached across requests:

```typescript
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, options);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}
```

## Typing Conventions

**From `.cursor/rules/database-patterns.mdc`:**

### Document Type Naming

All database document types MUST have "Document" suffix:

```typescript
// ✅ Correct
interface ProductDocument {
  _id?: unknown;  // MongoDB ObjectId
  id: string;
  name: string;
  createdAt: Date;
}

// ❌ Incorrect
interface Product {
  _id?: any;
  id: string;
  name: string;
}
```

### Separation of Concerns

Always separate database types from client-facing interfaces:

```typescript
// Database document (with _id, internal fields)
export interface RulesDocument {
  _id?: unknown;
  agent: string;
  category: string;
  manifest: Manifest;
  files: RuleFile[];
  githubCommitSha: string;
  lastFetched: Date;
}

// Client interface (clean, no database artifacts)
export interface RulesData {
  agents: {
    [agentName: string]: {
      categories: {
        [categoryName: string]: RuleCategory;
      }
    }
  }
}
```

### Data Conversion

Always convert database documents to client interfaces:

```typescript
// ✅ Correct
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDatabase();
  const documents = await db.collection<ProductDocument>('products').find({}).toArray();

  // Convert to client interface
  return documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    // Map only needed fields
  }));
}

// ❌ Incorrect - exposing raw database documents
export async function getAllProducts(): Promise<ProductDocument[]> {
  const db = await getDatabase();
  return await db.collection<ProductDocument>('products').find({}).toArray();
}
```

## Rules Repository

**Location:** `src/server/rules-repository.ts`

### Collection: `rules_data`

Stores cached rules fetched from GitHub.

### Document Structure

```typescript
interface StoredRulesDocument {
  agent: string;           // Cursor, Windsurf, etc.
  category: string;        // TypeScript, React, etc.
  manifest: Manifest;      // Category metadata
  files: RuleFile[];       // Rule file contents
  githubCommitSha: string; // For invalidation
  lastFetched: Date;       // Last GitHub sync
  createdAt: Date;
  updatedAt: Date;
}
```

### Operations

#### `findAllStoredRules()`

Fetches all rules and reconstructs nested RulesData structure:

```typescript
async function findAllStoredRules(): Promise<RulesData | null> {
  const db = await getDatabase();
  const documents = await db.collection<StoredRulesDocument>('rules_data')
    .find({})
    .toArray();

  if (documents.length === 0) {
    return null;
  }

  // Transform flat documents into nested structure
  const result: RulesData = { agents: {} };

  for (const doc of documents) {
    if (!result.agents[doc.agent]) {
      result.agents[doc.agent] = { categories: {} };
    }

    result.agents[doc.agent].categories[doc.category] = {
      manifest: doc.manifest,
      files: doc.files
    };
  }

  return result;
}
```

#### `storeRulesData(data)`

Upserts rule data by agent+category key:

```typescript
async function storeRulesData(data: RulesDataToStore): Promise<void> {
  const db = await getDatabase();

  await db.collection('rules_data').updateOne(
    { agent: data.agent, category: data.category },
    {
      $set: {
        manifest: data.manifest,
        files: data.files,
        githubCommitSha: data.githubCommitSha,
        lastFetched: new Date(),
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
}
```

## Questions Repository

**Location:** `src/server/questions-repository.ts`

### Collection: `questions`

Stores generated questions for rule refinement.

### Document Structure

```typescript
interface QuestionDocument {
  id: string;              // Unique question ID
  text: string;            // Question text
  type: "yes-no" | "choice" | "open-ended";
  tags: string[];          // For searching questions
  keywords?: string[];     // For yes-no questions
  options?: Array<{        // For choice questions
    text: string;
    keywords: string[];
  }>;
  sourceFile: string;      // Original rule file
  lastFetched: Date;       // Last sync from GitHub
  createdAt: Date;
  updatedAt: Date;
}
```

### Operations

#### `findAllStoredQuestions()`

Fetches all questions and converts to client interface:

```typescript
async function findAllStoredQuestions(): Promise<Question[]> {
  const db = await getDatabase();
  const documents = await db.collection<QuestionDocument>('questions')
    .find({})
    .toArray();

  // Convert to client interface (remove internal fields)
  return documents.map((doc) => ({
    id: doc.id,
    text: doc.text,
    type: doc.type,
    tags: doc.tags,
    keywords: doc.keywords,
    options: doc.options
  }));
}
```

#### `cacheQuestionsInDatabase(questions)`

Upserts questions by ID:

```typescript
async function cacheQuestionsInDatabase(
  questions: Question[],
  sourceFile: string
): Promise<void> {
  const db = await getDatabase();

  for (const question of questions) {
    await db.collection('questions').updateOne(
      { id: question.id },
      {
        $set: {
          text: question.text,
          type: question.type,
          tags: question.tags,
          keywords: question.keywords,
          options: question.options,
          sourceFile,
          lastFetched: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }
}
```

#### `clearQuestionsCache()`

Deletes all questions:

```typescript
async function clearQuestionsCache(): Promise<void> {
  const db = await getDatabase();
  await db.collection('questions').deleteMany({});
}
```

## Indexing Strategy

**Recommended indexes:**

```typescript
// Rules collection
db.collection('rules_data').createIndex({ agent: 1, category: 1 }, { unique: true });
db.collection('rules_data').createIndex({ lastFetched: 1 });

// Questions collection
db.collection('questions').createIndex({ id: 1 }, { unique: true });
db.collection('questions').createIndex({ tags: 1 });
db.collection('questions').createIndex({ sourceFile: 1 });
```

## Error Handling

Repository functions handle errors at boundaries:

- **Connection errors:** Throw descriptive error for caller to handle
- **Query errors:** Log and throw with context
- **Validation errors:** Return null or empty array (depending on operation)
- **Duplicate key errors:** Silently ignore (upsert handles this)
