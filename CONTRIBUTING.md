# Contributing to GalaOS

Thank you for your interest in contributing to GalaOS! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report:
1. Check the existing issues to avoid duplicates
2. Collect information about the bug (steps to reproduce, expected vs actual behavior)
3. Include system details (OS, Node version, browser)

When creating a bug report, include:
- Clear and descriptive title
- Detailed steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Error messages or logs

### Suggesting Features

Feature suggestions are welcome! Please:
1. Check if the feature is already in the [ROADMAP.md](./ROADMAP.md)
2. Describe the problem you're trying to solve
3. Propose your solution
4. Consider alternative solutions
5. Explain why this would be useful to most users

### Pull Requests

#### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/GalaOS.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with a clear message
7. Push to your fork
8. Open a Pull Request

#### PR Guidelines

- Follow the existing code style
- Write clear commit messages
- Update documentation if needed
- Add tests for new features
- Ensure all tests pass
- Keep PRs focused on a single feature or fix

#### Commit Messages

Use conventional commits:

```
feat: add new workflow node for email sending
fix: resolve database connection timeout
docs: update getting started guide
style: format code with prettier
refactor: simplify authentication logic
test: add tests for workspace creation
chore: update dependencies
```

## Development Setup

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.

Quick setup:

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/GalaOS.git
cd GalaOS

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development environment
npm run dev
```

## Project Structure

```
galaos/
├── apps/
│   ├── api/              # Backend API
│   │   ├── src/
│   │   │   ├── router/   # tRPC routers
│   │   │   └── index.ts  # Entry point
│   │   └── package.json
│   └── web/              # Frontend
│       ├── src/
│       │   ├── app/      # Next.js pages
│       │   ├── components/
│       │   └── lib/
│       └── package.json
├── packages/
│   ├── db/               # Prisma database
│   ├── types/            # Shared types
│   └── ...
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Use proper typing (avoid `any`)
- Document complex types

### Code Style

We use Prettier and ESLint:

```bash
npm run format  # Format code
npm run lint    # Check linting
```

### Naming Conventions

- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserProfile`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

### Component Guidelines

```tsx
// Good
export function UserProfile({ userId }: { userId: string }) {
  // Component logic
  return <div>...</div>;
}

// Avoid
export default function (props) {
  return <div>...</div>;
}
```

## Testing

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  it('should create a new user', async () => {
    const user = await createUser({ email: 'test@example.com' });
    expect(user.email).toBe('test@example.com');
  });
});
```

## Database Changes

When modifying the database schema:

1. Update `packages/db/prisma/schema.prisma`
2. Create a migration: `npm run db:migrate`
3. Generate Prisma client: `npm run db:generate`
4. Test the migration thoroughly

```bash
# Create migration
npm run db:migrate

# Reset database (development only!)
npx prisma migrate reset
```

## Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for architectural changes
- Add inline comments for complex logic
- Update API documentation for new endpoints

## Areas to Contribute

### Good First Issues

Look for issues labeled `good first issue`:
- Bug fixes
- Documentation improvements
- Small feature additions
- Test coverage

### High Priority

- Integration connectors
- Workflow nodes
- AI agent improvements
- Performance optimizations

### Advanced

- Core workflow engine
- Real-time collaboration
- Plugin system architecture
- Security enhancements

## Review Process

1. Submit your PR
2. Automated checks must pass (linting, tests)
3. Maintainers will review your code
4. Address any feedback
5. Once approved, it will be merged

## Recognition

Contributors will be:
- Added to the contributors list
- Mentioned in release notes (for significant contributions)
- Credited in the documentation

## Questions?

- Open a GitHub Discussion
- Create an issue
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to GalaOS!
