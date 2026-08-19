# Inventory Lite - Development Rules & Guidelines

## Project Overview

Inventory Lite is a multi-tenant SaaS for inventory and billing management targeting small businesses in Nepal. Built with Next.js, TypeScript, and Appwrite.

## Technology Stack

**Frontend:**
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

**Backend:**
- Appwrite (BaaS)
- Appwrite Authentication
- Appwrite Databases/TablesDB
- Appwrite Storage
- Appwrite Functions (when needed)

**Libraries:**
- React Hook Form (form management)
- Zod (validation)
- Recharts (charts)
- date-fns (date utilities)

**Testing:**
- Vitest (unit tests)
- Playwright (E2E tests)

**Deployment:**
- Vercel (frontend)
- GitHub (version control)

## Project Structure

```
inventory-lite-saas/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Homepage
│   │   ├── globals.css          # Global styles
│   │   └── (routes)/            # Route groups
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   └── features/            # Business-specific components
│   ├── lib/                     # Utility functions
│   │   ├── utils.ts             # General utilities
│   │   ├── validations.ts       # Zod schemas
│   │   ├── error-handler.ts     # Error handling
│   │   └── security.ts          # Security utilities
│   ├── services/                # Appwrite service layer
│   │   ├── base.service.ts      # Base service with tenant isolation
│   │   ├── auth.service.ts      # Authentication service
│   │   └── business.service.ts  # Business service
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript type definitions
│   ├── config/                  # Configuration files
│   │   └── appwrite.ts          # Appwrite client setup
│   └── test/                    # Test setup files
├── e2e/                         # Playwright E2E tests
├── public/                      # Static assets
└── [config files]              # Next.js, TypeScript, etc.
```

## Coding Standards

### TypeScript Conventions

1. **Strict Mode**: Always use TypeScript strict mode
2. **Type Safety**: Avoid `any` types - use proper typing
3. **Interface vs Type**: Use `interface` for object shapes that can be extended, `type` for unions and computed types
4. **Explicit Returns**: Always return explicit types from functions
5. **Null Checks**: Use optional chaining (`?.`) and nullish coalescing (`??`)
6. **Type Imports**: Use `import type` for type-only imports

```typescript
// Good
interface User {
  id: string
  name: string
}

type UserRole = 'admin' | 'user' | 'guest'

async function getUser(id: string): Promise<User | null> {
  // implementation
}

// Bad
function getUser(id: any): any {
  // implementation
}
```

### Component Conventions

1. **Functional Components**: Only use functional components with hooks
2. **Props Interface**: Always define props interface
3. **Default Props**: Use default parameters instead of defaultProps
4. **Component Size**: Keep components under 200 lines - split if larger
5. **Naming**: Use PascalCase for component names
6. **File Structure**: One component per file, matching file name to component name

```typescript
// Good
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}

// Bad
export default function Button(props) {
  return <button>{props.label}</button>
}
```

### Service Layer Conventions

1. **Base Service**: Extend `BaseService` for all business-specific services
2. **Tenant Isolation**: Always pass `businessId` to service methods
3. **Error Handling**: Use custom error classes from error-handler
4. **Type Safety**: Return typed data from service methods
5. **Singleton Pattern**: Export service instances as singletons

```typescript
// Good
export class ProductService extends BaseService {
  constructor() {
    super(COLLECTIONS.PRODUCTS)
  }

  async createProduct(data: ProductInput, businessId: string, userId: string) {
    return await this.create(data, businessId, userId)
  }
}

export const productService = new ProductService()
```

### Hooks Conventions

1. **Naming**: Prefix custom hooks with `use`
2. **Return Type**: Always define return type interface
3. **Error Handling**: Handle errors within hooks
4. **Loading States**: Return loading states from data fetching hooks
5. **Memoization**: Use `useMemo` and `useCallback` appropriately

```typescript
// Good
interface UseProductsResult {
  products: Product[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useProducts(businessId: string): UseProductsResult {
  // implementation
}
```

## Naming Conventions

### Files and Folders
- **Components**: PascalCase (`Button.tsx`, `UserProfile.tsx`)
- **Utilities**: camelCase (`utils.ts`, `formatDate.ts`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useProducts.ts`)
- **Services**: camelCase with `service` suffix (`auth.service.ts`)
- **Types**: camelCase (`types.ts`, `user.types.ts`)
- **Tests**: Same as file being tested with `.test.ts` or `.spec.ts` suffix

### Variables and Functions
- **Variables**: camelCase (`userName`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Functions**: camelCase with descriptive verbs (`getUserData`, `formatCurrency`)
- **Classes**: PascalCase (`UserService`, `ValidationError`)
- **Interfaces**: PascalCase (`UserProps`, `ApiResponse`)

### React Specific
- **Components**: PascalCase (`Button`, `UserProfile`)
- **Props**: camelCase (`onClick`, `isLoading`)
- **State Variables**: camelCase (`[products, setProducts]`)

## Error Handling Strategy

### Error Types
- `AppError`: Base error class
- `ValidationError`: For form validation errors
- `AuthenticationError`: For auth failures
- `AuthorizationError`: For permission issues
- `NotFoundError`: For missing resources
- `NetworkError`: For network failures

### Error Handling Pattern
```typescript
try {
  const result = await service.method()
  // handle success
} catch (error) {
  const appError = handleApiError(error)
  // handle error based on type
  if (appError instanceof ValidationError) {
    // show validation errors
  } else if (appError instanceof AuthenticationError) {
    // redirect to login
  } else {
    // show generic error
  }
}
```

### User-Facing Messages
- Always use user-friendly error messages
- Log technical details for debugging
- Provide actionable error recovery steps

## Loading State Strategy

### Loading Components
- `LoadingSpinner`: For inline loading
- `LoadingSkeleton`: For placeholder content
- `LoadingPage`: For full-page loading
- `LoadingOverlay`: For overlay loading on existing content

### Implementation Pattern
```typescript
const [loading, setLoading] = useState(true)
const [data, setData] = useState(null)

useEffect(() => {
  async function loadData() {
    try {
      setLoading(true)
      const result = await fetchData()
      setData(result)
    } catch (error) {
      // handle error
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [])

if (loading) return <LoadingPage />
if (!data) return <EmptyState />
return <DataDisplay data={data} />
```

## Empty State Strategy

### Empty State Components
- Use `EmptyState` component for consistent empty states
- Provide contextual icons and messages
- Include action buttons when appropriate
- Use size variants for different contexts

### Implementation Pattern
```typescript
{items.length === 0 ? (
  <EmptyProducts onAdd={handleAddProduct} />
) : (
  <ProductList items={items} />
)}
```

## Security Principles

### Multi-Tenant Security
1. **Tenant Isolation**: All data queries must include `businessId` filter
2. **Role-Based Access**: Verify user roles before operations
3. **Data Validation**: Validate all inputs using Zod schemas
4. **API Security**: Never expose server-side secrets to client

### Code Security Practices
1. **Input Sanitization**: Sanitize user inputs to prevent XSS
2. **Password Security**: Use strong password requirements
3. **File Uploads**: Validate file types and sizes
4. **Session Management**: Use Appwrite's built-in session handling

### Environment Variables
- Never commit `.env.local` files
- Use `.env.example` for documentation
- Prefix public variables with `NEXT_PUBLIC_`
- Keep sensitive data server-side only

## Testing Strategy

### Unit Tests (Vitest)
- Test utility functions
- Test custom hooks
- Test service methods
- Aim for 80%+ code coverage

### E2E Tests (Playwright)
- Test critical user flows
- Test authentication flows
- Test multi-tenant isolation
- Test across browsers

### Test Organization
```
src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
├── services/
│   ├── auth.service.ts
│   └── auth.service.test.ts
e2e/
├── auth.spec.ts
└── products.spec.ts
```

## Development Workflow

### Git Workflow
1. Create feature branch from `main`
2. Make changes with clear, focused commits
3. Run tests and linting before committing
4. Create pull request for review
5. Address feedback and merge

### Commit Message Format
```
feat: add user registration feature
fix: resolve tenant isolation bug
docs: update API documentation
refactor: simplify service layer
test: add unit tests for utils
```

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Tenant isolation is maintained
- [ ] Tests are included
- [ ] Code follows conventions
- [ ] No sensitive data exposed
- [ ] Performance considerations addressed

## Build and Deployment

### Local Development
```bash
npm install
npm run dev    # Start development server
npm run test   # Run unit tests
npm run test:e2e  # Run E2E tests
npm run lint   # Run ESLint
npm run build  # Build for production
```

### Deployment to Vercel
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel
3. Deploy on push to `main` branch
4. Enable automatic deployments

### Environment Variables
Required variables:
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_API_KEY`

## Performance Guidelines

1. **Code Splitting**: Use dynamic imports for large components
2. **Image Optimization**: Use Next.js Image component
3. **Caching**: Implement appropriate caching strategies
4. **Bundle Size**: Monitor bundle size with `npm run build`
5. **Lazy Loading**: Load components and routes lazily when appropriate

## Accessibility Guidelines

1. **Semantic HTML**: Use proper semantic elements
2. **ARIA Labels**: Add ARIA labels for interactive elements
3. **Keyboard Navigation**: Ensure keyboard accessibility
4. **Color Contrast**: Meet WCAG AA standards
5. **Screen Readers**: Test with screen readers

## Monitoring and Logging

1. **Error Tracking**: Implement error tracking (e.g., Sentry)
2. **Performance Monitoring**: Monitor app performance
3. **User Analytics**: Track user behavior (with consent)
4. **Audit Logs**: Maintain audit logs for sensitive operations

## Documentation Standards

1. **Code Comments**: Add comments for complex logic
2. **README**: Keep project README updated
3. **API Documentation**: Document API endpoints
4. **Component Documentation**: Document component props
5. **Change Log**: Maintain change log for releases

## Troubleshooting

### Common Issues
- **Build Failures**: Check TypeScript errors and missing dependencies
- **Test Failures**: Check test setup and environment configuration
- **Appwrite Errors**: Verify Appwrite configuration and permissions
- **Deployment Issues**: Check environment variables and build logs

### Debugging Tips
1. Use browser DevTools for frontend issues
2. Check Appwrite console for backend issues
3. Review error logs in production
4. Test in isolation to identify issues

## Continuous Improvement

1. **Regular Updates**: Keep dependencies updated
2. **Code Reviews**: Conduct thorough code reviews
3. **Performance Audits**: Regular performance audits
4. **Security Audits**: Regular security assessments
5. **User Feedback**: Collect and act on user feedback

---

## Quick Reference

### Essential Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Run ESLint
```

### Key Files
- `src/config/appwrite.ts` - Appwrite configuration
- `src/lib/validations.ts` - Zod validation schemas
- `src/types/index.ts` - TypeScript type definitions
- `src/services/base.service.ts` - Base service with tenant isolation
- `src/lib/error-handler.ts` - Error handling utilities
- `src/lib/security.ts` - Security utilities and principles

### Appwrite Collections
- `businesses` - Business entities
- `users` - User profiles
- `business_members` - Business memberships
- `products` - Product inventory
- `categories` - Product categories
- `customers` - Customer records
- `invoices` - Invoice records
- `invoice_items` - Invoice line items
- `transactions` - Payment transactions

---

**Remember**: This is a multi-tenant SaaS. Tenant isolation is critical. Never skip tenant validation in data operations. Always follow security best practices. Keep code clean, tested, and well-documented.
