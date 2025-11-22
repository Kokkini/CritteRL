<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0
Modified principles: N/A
Added sections: N/A
Removed sections: N/A
Technology requirement added: TypeScript (MINOR version bump)
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (no changes needed - already supports language specification)
  ✅ .specify/templates/spec-template.md (no changes needed)
  ✅ .specify/templates/tasks-template.md (no changes needed)
Follow-up TODOs: None
-->

# CritteRL Constitution

## Core Principles

### I. Static Web Front-End Only (NON-NEGOTIABLE)

The application MUST be a static web front-end with no backend server. All functionality MUST execute entirely in the browser. No server-side APIs, databases, or server processes are permitted. The application MUST be deployable as static files (HTML, CSS, JavaScript) to any static hosting service (GitHub Pages, Netlify, Vercel, CDN, etc.). All data persistence MUST use browser storage mechanisms (localStorage, IndexedDB) if needed. All computation, including RL training, MUST run client-side in the browser.

**Rationale**: Enables zero-cost deployment, eliminates server maintenance, ensures offline capability, and simplifies distribution. RL training will use browser-based frameworks (e.g., TensorFlow.js, WebAssembly) to run neural network computations client-side.

## Architecture Constraints

### Technology Stack

- **Language**: TypeScript (MUST be used for all source code)
- **Front-End Framework**: Modern JavaScript framework (React, Vue, Svelte, or vanilla JS) - written in TypeScript
- **RL Framework**: MimicRL (already in src/MimicRL)
- **Physics Engine**: JavaScript or WebAssembly physics library (Matter.js, Box2D.js, or custom) - TypeScript bindings/definitions required
- **Build Tools**: Static site generator or bundler (Vite, Webpack, Parcel) with TypeScript support
- **Deployment**: Static file hosting on GitHub Pages
- **Storage**: Browser APIs only (localStorage, IndexedDB, SessionStorage)

### Prohibited Technologies

- Backend servers (Node.js servers, Python Flask/Django, etc.)
- Server-side databases (PostgreSQL, MongoDB, etc.)
- External APIs for computation or training
- Server-side rendering (SSR) - static generation only
- Serverless functions that process data (API routes, Lambda functions)

### Performance Standards

- Initial page load: < 3 seconds on 3G connection
- RL training: Must not freeze UI (use Web Workers if needed)
- Physics simulation: Maintain 60fps for smooth visualization
- Memory usage: Optimize to prevent browser crashes on lower-end devices

## Development Workflow

### Code Organization

- **Source Structure**: `src/` directory with modular components
- **Static Assets**: `public/` or `assets/` for images, models, etc.
- **Tests**: `tests/` directory with browser-compatible test files
- **Build Output**: `dist/` or `build/` directory for static files

### Development Process

1. **Local Development**: Run development server (e.g., `vite dev`, `npm start`)
2. **Testing**: Run browser-based tests before committing
3. **Build**: Generate static files for deployment
4. **Deploy**: Push static files to hosting service

## Governance

This constitution supersedes all other development practices. Amendments require:
1. Documentation of the change rationale
2. Update to this constitution file with version bump
3. Verification that all templates and related documents are updated
4. Review of impact on existing code and architecture

All pull requests and code reviews MUST verify compliance with these principles. Any violation of the static web front-end only principle MUST be explicitly justified and approved before implementation. Complexity additions (e.g., WebAssembly modules) MUST be justified against simpler alternatives.

**Version**: 1.1.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
