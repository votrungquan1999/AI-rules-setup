# Manifest Schema Specification

## Overview

Each rule category in the AI Rules repository must include a `manifest.json` file that describes the rules, their metadata, and how they should be installed. This document defines the schema for these manifest files.

## Schema Definition

### Root Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "category", "tags", "description", "files"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for this rule category",
      "pattern": "^[a-z0-9-]+$"
    },
    "category": {
      "type": "string",
      "description": "Primary category name",
      "pattern": "^[a-z0-9-]+$"
    },
    "tags": {
      "type": "array",
      "description": "Tags for filtering and discovery",
      "items": {
        "type": "string",
        "pattern": "^[a-z0-9-]+$"
      },
      "minItems": 1
    },
    "description": {
      "type": "string",
      "description": "Human-readable description of the rules",
      "minLength": 10,
      "maxLength": 500
    },
    "files": {
      "type": "array",
      "description": "List of files in this rule category",
      "items": {
        "$ref": "#/$defs/FileEntry"
      },
      "minItems": 1
    },
    "questions": {
      "type": "array",
      "description": "Refinement questions for this category",
      "items": {
        "$ref": "#/$defs/Question"
      }
    },
    "dependencies": {
      "type": "array",
      "description": "Other rule categories this depends on",
      "items": {
        "type": "string"
      }
    },
    "conflicts": {
      "type": "array",
      "description": "Rule categories that conflict with this one",
      "items": {
        "type": "string"
      }
    },
    "version": {
      "type": "string",
      "description": "Version of this rule category",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "lastUpdated": {
      "type": "string",
      "description": "ISO 8601 timestamp of last update",
      "format": "date-time"
    }
  },
  "$defs": {
    "FileEntry": {
      "type": "object",
      "required": ["path", "description"],
      "properties": {
        "path": {
          "type": "string",
          "description": "Relative path to the file within the category directory",
          "pattern": "^[^/].*\\.(md|txt|json)$"
        },
        "description": {
          "type": "string",
          "description": "Description of what this file contains",
          "minLength": 5,
          "maxLength": 200
        },
        "required": {
          "type": "boolean",
          "description": "Whether this file is required for the rules to work",
          "default": true
        },
        "outputPath": {
          "type": "string",
          "description": "Custom output path override (relative to project root)"
        }
      }
    },
    "Question": {
      "type": "object",
      "required": ["id", "text", "type"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier for this question",
          "pattern": "^[a-z0-9-]+$"
        },
        "text": {
          "type": "string",
          "description": "Question text to display to the user",
          "minLength": 10,
          "maxLength": 200
        },
        "type": {
          "type": "string",
          "enum": ["choice", "boolean", "text"],
          "description": "Type of question input"
        },
        "choices": {
          "type": "array",
          "description": "Available choices for 'choice' type questions",
          "items": {
            "type": "string"
          },
          "minItems": 2
        },
        "default": {
          "type": "string",
          "description": "Default value for the question"
        },
        "required": {
          "type": "object",
          "description": "Conditions that must be met for this question to be asked",
          "properties": {
            "tags": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "categories": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "affects": {
          "type": "array",
          "description": "Rule IDs that this question affects",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

## Example Manifests

### TypeScript Rules

```json
{
  "id": "typescript-strict",
  "category": "typescript",
  "tags": ["language", "typed", "strict"],
  "description": "TypeScript strict mode rules with comprehensive type checking and best practices",
  "version": "1.2.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "files": [
    {
      "path": "typescript-strict.md",
      "description": "Main TypeScript strict mode rules",
      "required": true
    },
    {
      "path": "typescript-advanced.md",
      "description": "Advanced TypeScript patterns and utilities",
      "required": false
    }
  ],
  "questions": [
    {
      "id": "strict-mode",
      "text": "Do you want to enable strict mode?",
      "type": "boolean",
      "default": "true",
      "affects": ["typescript-strict"]
    },
    {
      "id": "advanced-patterns",
      "text": "Do you use advanced TypeScript patterns?",
      "type": "boolean",
      "default": "false",
      "affects": ["typescript-advanced"]
    }
  ],
  "dependencies": [],
  "conflicts": ["typescript-loose"]
}
```

### React Server Components

```json
{
  "id": "react-server-components",
  "category": "react",
  "tags": ["framework", "react", "server-components", "nextjs"],
  "description": "React Server Components best practices and patterns for Next.js App Router",
  "version": "2.1.0",
  "lastUpdated": "2024-01-20T14:15:00Z",
  "files": [
    {
      "path": "server-components.md",
      "description": "Core Server Components rules and patterns",
      "required": true
    },
    {
      "path": "client-components.md",
      "description": "Client Components usage guidelines",
      "required": true
    },
    {
      "path": "data-fetching.md",
      "description": "Server-side data fetching patterns",
      "required": false
    }
  ],
  "questions": [
    {
      "id": "router-type",
      "text": "Which Next.js router are you using?",
      "type": "choice",
      "choices": ["App Router", "Pages Router"],
      "default": "App Router",
      "affects": ["react-server-components"]
    },
    {
      "id": "data-fetching",
      "text": "What's your primary data fetching strategy?",
      "type": "choice",
      "choices": ["Server Components", "React Query", "SWR", "getServerSideProps"],
      "required": {
        "tags": ["nextjs"]
      },
      "affects": ["react-server-components", "data-fetching"]
    }
  ],
  "dependencies": ["typescript-strict"],
  "conflicts": ["react-class-components"]
}
```

### Tailwind CSS

```json
{
  "id": "tailwind-best-practices",
  "category": "tailwind",
  "tags": ["styling", "css", "utility-first", "responsive"],
  "description": "Tailwind CSS best practices, component patterns, and responsive design guidelines",
  "version": "1.5.0",
  "lastUpdated": "2024-01-18T09:45:00Z",
  "files": [
    {
      "path": "tailwind-basics.md",
      "description": "Basic Tailwind CSS usage and conventions",
      "required": true
    },
    {
      "path": "component-patterns.md",
      "description": "Reusable component patterns with Tailwind",
      "required": true
    },
    {
      "path": "responsive-design.md",
      "description": "Responsive design patterns and breakpoints",
      "required": false
    }
  ],
  "questions": [
    {
      "id": "component-library",
      "text": "Are you using a component library?",
      "type": "choice",
      "choices": ["shadcn/ui", "Headless UI", "Chakra UI", "None"],
      "default": "None",
      "affects": ["tailwind-best-practices"]
    },
    {
      "id": "custom-design-system",
      "text": "Do you have a custom design system?",
      "type": "boolean",
      "default": "false",
      "affects": ["component-patterns"]
    }
  ],
  "dependencies": [],
  "conflicts": ["styled-components", "emotion", "css-modules"]
}
```

## Field Descriptions

### Required Fields

#### `id`

- **Type**: String
- **Pattern**: `^[a-z0-9-]+$`
- **Description**: Unique identifier for this rule category
- **Example**: `"typescript-strict"`

#### `category`

- **Type**: String
- **Pattern**: `^[a-z0-9-]+$`
- **Description**: Primary category name (matches directory name)
- **Example**: `"typescript"`

#### `tags`

- **Type**: Array of strings
- **Description**: Tags for filtering and discovery
- **Example**: `["language", "typed", "strict"]`

#### `description`

- **Type**: String
- **Length**: 10-500 characters
- **Description**: Human-readable description of the rules
- **Example**: `"TypeScript strict mode rules with comprehensive type checking"`

#### `files`

- **Type**: Array of FileEntry objects
- **Description**: List of files in this rule category
- **Minimum**: 1 file

### Optional Fields

#### `questions`

- **Type**: Array of Question objects
- **Description**: Refinement questions for better rule selection
- **Use Case**: Interactive refinement in Iteration 5+

#### `dependencies`

- **Type**: Array of strings
- **Description**: Other rule categories this depends on
- **Example**: `["typescript-strict"]`

#### `conflicts`

- **Type**: Array of strings
- **Description**: Rule categories that conflict with this one
- **Example**: `["typescript-loose"]`

#### `version`

- **Type**: String
- **Pattern**: `^\d+\.\d+\.\d+$`
- **Description**: Semantic version of this rule category
- **Example**: `"1.2.0"`

#### `lastUpdated`

- **Type**: String (ISO 8601)
- **Description**: Timestamp of last update
- **Example**: `"2024-01-15T10:30:00Z"`

## File Entry Schema

### Required Fields

#### `path`

- **Type**: String
- **Pattern**: `^[^/].*\.(md|txt|json)$`
- **Description**: Relative path to the file within the category directory
- **Example**: `"typescript-strict.md"`

#### `description`

- **Type**: String
- **Length**: 5-200 characters
- **Description**: Description of what this file contains
- **Example**: `"Main TypeScript strict mode rules"`

### Optional Fields

#### `required`

- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether this file is required for the rules to work

#### `outputPath`

- **Type**: String
- **Description**: Custom output path override (relative to project root)
- **Example**: `".cursor/rules/typescript-strict.md"`

## Question Schema

### Required Fields

#### `id`

- **Type**: String
- **Pattern**: `^[a-z0-9-]+$`
- **Description**: Unique identifier for this question
- **Example**: `"strict-mode"`

#### `text`

- **Type**: String
- **Length**: 10-200 characters
- **Description**: Question text to display to the user
- **Example**: `"Do you want to enable strict mode?"`

#### `type`

- **Type**: String
- **Enum**: `["choice", "boolean", "text"]`
- **Description**: Type of question input
- **Example**: `"boolean"`

### Optional Fields

#### `choices`

- **Type**: Array of strings
- **Description**: Available choices for 'choice' type questions
- **Example**: `["App Router", "Pages Router"]`

#### `default`

- **Type**: String
- **Description**: Default value for the question
- **Example**: `"true"`

#### `required`

- **Type**: Object
- **Description**: Conditions that must be met for this question to be asked
- **Properties**:
  - `tags`: Array of required tags
  - `categories`: Array of required categories

#### `affects`

- **Type**: Array of strings
- **Description**: Rule IDs that this question affects
- **Example**: `["typescript-strict"]`

## Validation Rules

### ID and Category Naming

- Must use lowercase letters, numbers, and hyphens only
- Must not start or end with a hyphen
- Must be unique within the repository

### Tag Naming

- Must use lowercase letters, numbers, and hyphens only
- Should be descriptive and consistent across categories
- Common tags: `language`, `framework`, `styling`, `database`, `testing`

### File Paths

- Must be relative to the category directory
- Must not start with `/` or `../`
- Must have a supported extension (`.md`, `.txt`, `.json`)

### Descriptions

- Must be clear and descriptive
- Should explain what the rules do, not how to use them
- Should be written for developers who might install these rules

## Best Practices

### Writing Effective Manifests

1. **Clear Descriptions**: Write descriptions that help developers understand what the rules do
2. **Comprehensive Tags**: Use tags that make rules discoverable through search
3. **Logical Dependencies**: Only declare dependencies that are truly required
4. **Meaningful Conflicts**: Only declare conflicts that would cause actual problems
5. **Helpful Questions**: Write questions that help users make informed decisions

### File Organization

1. **Single Responsibility**: Each file should have a clear, single purpose
2. **Logical Naming**: Use descriptive filenames that indicate content
3. **Required vs Optional**: Mark files as required only if they're essential
4. **Consistent Structure**: Use consistent file organization across categories

### Question Design

1. **Clear Language**: Write questions in plain, understandable language
2. **Logical Flow**: Order questions from general to specific
3. **Helpful Defaults**: Provide sensible default values
4. **Conditional Logic**: Use required conditions to avoid irrelevant questions
5. **Meaningful Impact**: Only ask questions that affect rule selection

## Migration and Versioning

### Schema Evolution

- Add new optional fields without breaking existing manifests
- Use version field to track schema changes
- Provide migration tools for major schema changes

### Backward Compatibility

- Always support reading older manifest versions
- Provide clear error messages for unsupported versions
- Suggest upgrade paths for deprecated fields

### Version Management

- Use semantic versioning for rule categories
- Update version when making significant changes
- Include lastUpdated timestamp for all changes
