# Contributing to 24Hours Automation

Thank you for your interest in contributing to 24Hours Automation! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js 20+
- Redis 7+
- Git

### First-time Setup

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/24hours-automation.git
   cd 24hours-automation
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/24hours-automation.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

## Development Setup

### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Start Development Servers

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
npm run start:dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Configure Test Settings

Open `http://localhost:5173` and configure:
- Linear API key (can use a test workspace)
- Anthropic API key or proxy credentials

## Making Changes

### Branch Naming

Use descriptive branch names:

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/add-webhook-support` |
| Bug fix | `fix/description` | `fix/session-persistence` |
| Docs | `docs/description` | `docs/improve-readme` |
| Refactor | `refactor/description` | `refactor/queue-module` |

### Workflow

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes**
   - Write code
   - Add tests if applicable
   - Update documentation

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add webhook support for Linear"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(queue): add priority-based job ordering
fix(claude): handle session timeout gracefully
docs(readme): add deployment section
refactor(linear): extract API client
```

## Submitting Changes

### Pull Request Process

1. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your branch

2. **Fill out PR template**
   - Describe what changes you made
   - Explain why the changes are needed
   - List any breaking changes

3. **PR Title Format**
   ```
   feat: add webhook support
   fix: resolve session timeout
   docs: update deployment guide
   ```

4. **Wait for review**
   - Maintainers will review your PR
   - Address any feedback
   - Make requested changes

### PR Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` type when possible
- Use interfaces for object shapes

```typescript
// Good
interface TaskConfig {
  timeout: number;
  retries: number;
}

function processTask(config: TaskConfig): Promise<void> {
  // ...
}

// Avoid
function processTask(config: any): any {
  // ...
}
```

### NestJS Conventions

- Use dependency injection
- Follow module pattern
- Use decorators appropriately

```typescript
// Service
@Injectable()
export class MyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly linearService: LinearService,
  ) {}
}

// Controller
@Controller('api/my-endpoint')
export class MyController {
  @Get()
  async getData(): Promise<MyDto> {
    // ...
  }
}
```

### React/Frontend

- Use functional components with hooks
- Use TypeScript for props
- Keep components focused

```typescript
interface TaskCardProps {
  task: Task;
  onSelect: (id: string) => void;
}

export function TaskCard({ task, onSelect }: TaskCardProps) {
  return (
    <div onClick={() => onSelect(task.id)}>
      {task.title}
    </div>
  );
}
```

### Code Formatting

- Use Prettier for formatting
- Use ESLint for linting
- Run before committing:

```bash
npm run lint
npm run format
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### Writing Tests

```typescript
describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ClaudeService],
    }).compile();

    service = module.get<ClaudeService>(ClaudeService);
  });

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      const task = createMockTask();
      const result = await service.executeTask(task);
      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const task = createMockTask({ invalid: true });
      const result = await service.executeTask(task);
      expect(result.success).toBe(false);
    });
  });
});
```

### Test Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Unit | `*.spec.ts` | Test individual functions |
| Integration | `test/*.e2e-spec.ts` | Test module interactions |
| E2E | `test/e2e/*.ts` | Test full workflows |

## Documentation

### When to Update Docs

- Adding new features
- Changing existing behavior
- Adding new configuration options
- Fixing bugs that affect usage

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `docs/implementation.md` | Technical architecture |
| `docs/design-philosophy.md` | Design decisions |
| `docs/DEPLOYMENT.md` | Deployment guide |
| `docs/TROUBLESHOOTING.md` | Problem solving |

### Documentation Style

- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts
- Keep sections focused

## Questions?

- Open a GitHub Issue for bugs or feature requests
- Use GitHub Discussions for questions
- Check existing documentation first

Thank you for contributing!
