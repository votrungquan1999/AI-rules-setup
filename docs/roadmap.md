# AI Rules CLI - Iterative Development Roadmap

## Overview

This roadmap outlines the iterative development strategy for the AI Rules CLI project. Each iteration builds upon the previous one, adding measurable value while maintaining a working product at all times.

## Development Principles

- **MVP First**: Start with the bare minimum viable product
- **Iterative Enhancement**: Each iteration adds clear value
- **User Feedback Driven**: Incorporate feedback between iterations
- **Maintainable**: Keep code clean and well-documented
- **Extensible**: Design for future growth

## Iteration Timeline

| Iteration | Focus                          | Status    |
| --------- | ------------------------------ | --------- |
| 1         | MVP with Cursor support        | Completed |
| 2         | Expand Cursor rule library     | Completed |
| 3         | Web UI for Rule Selection      | Completed |
| 4         | Cache Revalidation             | Completed |
| 5         | Enhanced Commands              | Planned   |
| 6         | Semantic search with vector DB | Planned   |
| 7         | Interactive rule refinement    | Planned   |
| 8         | Community Expansion            | Planned   |
| 9         | Multi-tool support             | Planned   |
| 10        | Advanced features              | Planned   |

---

## Iteration 1: MVP (Bare Minimum)

**Goal**: Prove core concept with single tool support

### Success Criteria

- [ ] CLI works end-to-end for Cursor
- [x] Can install rule categories successfully
- [x] Configuration is saved and loaded properly

---

## Iteration 2: Expand Cursor Rule Library

**Goal**: Build comprehensive rule coverage for Cursor

### Success Criteria

- [x] Comprehensive rule categories are available
- [x] All categories have proper metadata
- [x] Clear contribution guidelines exist

---

## Iteration 3: Web UI for Rule Selection

**Goal**: Improve developer experience with visual rule selection interface

### Success Criteria

- [x] Web UI is functional with search and selection
- [x] Command generation works correctly
- [x] Non-interactive CLI commands work with flags
- [x] User experience is smooth and intuitive

---

## Iteration 4: Cache Revalidation

**Goal**: Enable real-time rule updates in production

### Features

- [x] Implement mechanism to revalidate cache when rules folder changes
- [x] Implementation: GitHub Actions workflow

**Purpose**: Quick implementation to ensure the web UI reflects rule changes immediately without manual intervention.

### Success Criteria

- [x] Rule changes trigger cache revalidation automatically

### Deliverables

- Cache revalidation mechanism (GitHub Actions + TypeScript script)
- Basic documentation (inline workflow comments)

---

## Current Development Challenge: Techstack Identification

**Status**: Blocking progress on Iterations 5-7

### The Problem

The tool is currently useful enough for manual rule selection through the web UI or CLI prompts, but scaling to provide automatic, intelligent rule recommendations requires solving a critical challenge: **automated techstack identification**.

### Key Issue

To provide value beyond manual category selection, the tool needs a programmatic way to:

- Generate context-appropriate questions about a developer's techstack
- Identify relevant rules based on detected technology choices
- Scale question generation without manual curation

**Current Limitation**: While the web UI and CLI can show all available rules, there's no intelligent way to automatically determine which rules are relevant to a specific developer's project without manually crafting question sets for each techstack combination.

### Impact

This challenge stalls progress on:

- **Iteration 5** (Enhanced Commands): Cannot intelligently suggest categories
- **Iteration 6** (Semantic Search): Search alone doesn't solve the discovery problem
- **Iteration 7** (Interactive Rule Refinement): Question generation is the core feature

### Why Manual Question Curation Doesn't Scale

- Technology combinations grow combinatorially (React + TypeScript + Next.js + Tailwind + ...)
- New frameworks emerge constantly
- Different projects within the same stack have different needs
- Maintaining question trees manually becomes unmanageable at scale

### The Solution Space

We need to find an approach that can:

1. **Programmatically generate questions** based on available rules
2. **Detect or infer techstack** from project files (package.json, requirements.txt, etc.)
3. **Combine detection with targeted questions** for edge cases
4. **Scale automatically** as the rule library grows

See [Techstack Identification Brainstorming](./brainstorming/techstack-identification.md) for detailed exploration of potential solutions.

---

## Iteration 5: Enhanced Commands

**Goal**: Improve CLI usability and safety

### Features

- [ ] Add commands for managing individual categories (add, remove, list)
- [ ] Implement conflict resolution when files already exist
- [ ] Add validation to prevent common errors
- [ ] Improve user feedback and experience

**Purpose**: Make the CLI more flexible and user-friendly for managing rules after initial setup.

### Success Criteria

- [ ] Users can manage rules without re-running init
- [ ] Conflicts are handled gracefully

### Deliverables

- Enhanced CLI commands
- Conflict resolution system
- Improved validation

---

## Iteration 6: Semantic Search with Vector DB

**Goal**: Enable natural language rule discovery

### Features

- [ ] Integrate vector database for semantic search
- [ ] Support natural language queries
- [ ] Return ranked results based on similarity
- [ ] Provide fallback to keyword search when needed

**Purpose**: Allow users to find relevant rules using natural language instead of browsing categories.

### Success Criteria

- [ ] Users can search with natural language queries
- [ ] Results are relevant and properly ranked

### Deliverables

- Vector database integration
- Search functionality
- Documentation

---

## Iteration 7: Interactive Rule Refinement

**Goal**: Improve rule selection accuracy through guided questions

### Features

- [ ] Ask clarifying questions after search
- [ ] Narrow down results based on user answers
- [ ] Save preferences for future use
- [ ] Support iterative refinement

**Purpose**: Help users select the most relevant rules by asking context-specific questions about their tech stack and preferences.

### Success Criteria

- [ ] Questions effectively narrow down rule selection
- [ ] Process is intuitive and quick

### Deliverables

- Question system
- Refinement flow
- Preference storage

---

## Iteration 8: Community Expansion

**Goal**: Enable community contributions through web interface

### Features

- [ ] Web-based rule editor with markdown preview
- [ ] Direct PR submission to GitHub from UI
- [ ] Community features (reviews, ratings, examples)
- [ ] Analytics dashboard for rule usage
- [ ] Public API for programmatic access

**Purpose**: Lower the barrier for community contributions and grow the rule library through collaborative efforts.

### Success Criteria

- [ ] Non-technical users can contribute rules
- [ ] Submission process is streamlined and intuitive

### Deliverables

- Rule editor interface
- GitHub integration
- Community features
- Analytics dashboard
- Public API

---

## Iteration 9: Multi-Tool Support

**Goal**: Expand beyond Cursor to other AI coding assistants

### Features

- [ ] Add support for additional AI tools (Windsurf, Aider, Continue, Cody)
- [ ] Implement tool-specific file conventions
- [ ] Enable multiple tools in one project
- [ ] Share rules across different tools

**Purpose**: Make the rule library accessible to users of different AI coding assistants, expanding the potential user base.

### Success Criteria

- [ ] Multiple AI tools are supported
- [ ] Each tool follows its own conventions correctly

### Deliverables

- Multi-tool support system
- Tool-specific adapters
- Documentation for each tool

---

## Iteration 10: Advanced Features

**Goal**: Production-ready polish and enterprise capabilities

### Features

- [ ] Version management with lockfile support
- [ ] Template system for dynamic rule generation
- [ ] Rule composition and merging capabilities
- [ ] Plugin system for extensibility
- [ ] CI/CD integration for automated workflows

**Purpose**: Add enterprise-grade features for larger teams and production use cases, ensuring stability and reproducibility.

### Success Criteria

- [ ] Rules can be version-locked for reproducibility
- [ ] Teams can customize rules with templates
- [ ] CI/CD pipelines can automate rule management

### Deliverables

- Version management system
- Template engine
- Rule composition tools
- Plugin architecture
- CI/CD integrations

---

## Risk Mitigation

### Technical Risks

- **Vector DB Performance**: Start with local LanceDB, add cloud support later
- **GitHub API Limits**: Implement caching and rate limiting
- **File System Issues**: Comprehensive error handling and validation

### Product Risks

- **User Adoption**: Focus on developer experience and clear value proposition
- **Rule Quality**: Establish quality guidelines and review process
- **Community Growth**: Provide clear contribution guidelines and templates

### Timeline Risks

- **Scope Creep**: Stick to iteration goals, defer nice-to-have features
- **Technical Complexity**: Start simple, add complexity iteratively
- **Dependencies**: Minimize external dependencies, have fallbacks

## Post-Iteration 10

### Future Considerations

- **Machine Learning**: Learn from usage patterns to improve recommendations
- **Enterprise Features**: Team management, private rule repositories
- **Mobile Support**: CLI tools for mobile development
- **IDE Integration**: Direct integration with popular IDEs
- **Rule Marketplace**: Community-driven rule sharing and monetization

### Maintenance

- **Regular Updates**: Keep rules current with technology changes
- **Community Support**: Maintain active community engagement
- **Performance Optimization**: Continuous improvement of search and discovery
- **Security**: Regular security audits and updates
