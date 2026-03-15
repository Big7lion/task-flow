# AGENTS.md - Developer Guide for task-flow

Always use Context7 when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

## Project Overview

This is a vanilla JavaScript frontend project using Vite as the build tool. 

使用 superpowers 模式，但跳过 TDD 步骤，直接进入实现阶段。我稍后会手动验证。

## Commands

### Development
```bash
npm run dev          # Start Vite dev server with hot reload
```

### Build
```bash
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

### Linting
```bash
npm run lint         # Run ESLint on src/ directory
npm run lint:fix     # Run ESLint with auto-fix
```

### Testing
```bash
npm run test         # Run tests in watch mode
npm run test:run    # Run tests once (CI mode)
npm test src/init.test.js  # Run a single test file
npm test -- --test-name-pattern="should export"  # Run tests matching pattern
```

---

## Code Style Guidelines

### General Principles

- Write clean, readable code over clever one-liners
- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names
- Comment the "why", not the "what"

### File Organization

```
src/
  main.js        # Entry point, app initialization
  init.js        # App setup logic
  style.css      # Global styles
  components/    # Reusable UI components
  utils/         # Helper functions
  api/           # API/network code
  *.test.js      # Unit tests co-located with source
```

### Imports

- Use ES modules with `import`/`export`
- Order imports: external libs → internal modules → local files
- Use absolute imports from `src/` when possible
```javascript
// Good
import { formatDate } from '../utils/date.js';
import { fetchUser } from '@/api/users.js';

// Avoid
import { formatDate } from './utils/date.js';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `user-service.js`, `init.test.js` |
| Functions | camelCase | `getUserById()`, `formatCurrency()` |
| Variables | camelCase | `const userList = []` |
| Constants | UPPER_SNAKE | `const MAX_RETRIES = 3` |
| Classes | PascalCase | `class UserService {}` |
| DOM elements | Descriptive with suffix | `const submitButton`, `const userList` |

### Functions

```javascript
// Good: Small, focused, descriptive name
function calculateTax(amount, rate) {
  if (amount <= 0 || rate < 0) {
    return 0;
  }
  return amount * rate;
}

// Avoid: Long functions with unclear purpose
function process() {
  // 50+ lines of mixed logic
}
```

### Error Handling

```javascript
// Good: Specific errors with context
async function fetchUser(id) {
  if (!id) {
    throw new Error('User ID is required');
  }
  
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch user error:', error);
    throw error; // Re-throw for caller to handle
  }
}

// Always handle async errors with try/catch
```

### DOM Manipulation

```javascript
// Good: Cache elements, use descriptive names
const userListElement = document.getElementById('user-list');

function renderUsers(users) {
  userListElement.innerHTML = users.map(user => 
    `<li>${user.name}</li>`
  ).join('');
}

// Use event delegation for multiple elements
userListElement.addEventListener('click', (e) => {
  if (e.target.matches('.user-item')) {
    handleUserClick(e.target.dataset.id);
  }
});
```

### CSS Guidelines

- Use semantic class names: `.user-card`, `.submit-button`
- Avoid deeply nested selectors (max 3 levels)
- Use CSS custom properties for theme values
- Keep styles co-located when possible (e.g., `component.css`)

```css
/* Good */
.button {
  padding: 0.5rem 1rem;
  background-color: var(--primary-color);
}

/* Avoid */
#app > div > .btn { }
```

### Testing

- Write tests for utility functions and business logic
- Use descriptive test names: `it('should return empty string for invalid input')`
- Test edge cases and error scenarios
- Mock external dependencies (fetch, DOM)

```javascript
describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
  });

  it('should return $0.00 for negative amounts', () => {
    expect(formatCurrency(-50, 'USD')).toBe('$0.00');
  });
});
```

### Console & Logging

- Remove `console.log` before committing
- Use appropriate log levels: `console.error()` for errors, `console.warn()` for warnings
- Avoid logging sensitive data (passwords, tokens)

### Git Commits

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Keep commits atomic and focused
- Write descriptive commit messages

---

## Common Patterns

### Event Handling
```javascript
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

### State Management
```javascript
const state = {
  users: [],
  loading: false,
  error: null,
};

function setState(updates) {
  Object.assign(state, updates);
  render();
}
```

---

## Additional Tips

- Run `npm run lint:fix` before committing
- Run `npm test:run` to verify tests pass before pushing
- Use browser DevTools for debugging (console, network tab)
- Check `dist/` build output before deploying
