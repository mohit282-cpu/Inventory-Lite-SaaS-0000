# Inventory Lite

Multi-tenant inventory and billing SaaS for small businesses in Nepal.

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Appwrite (Authentication, Database, Storage, Functions)
- **Libraries**: React Hook Form, Zod, Recharts, date-fns, Lucide React
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel, GitHub

## Getting Started

### Prerequisites

- Node.js 18+ 
- Appwrite account and project
- Git

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Appwrite credentials

4. Run development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   └── features/    # Business components
├── lib/             # Utilities and helpers
├── services/        # Appwrite service layer
├── hooks/           # Custom React hooks
├── types/           # TypeScript definitions
└── config/          # Configuration files
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests

### Coding Standards

See [AGENTS.md](./AGENTS.md) for detailed development rules and guidelines.

## Architecture

Inventory Lite follows a clean multi-tenant architecture:

- **Frontend**: Next.js with App Router for client-side rendering
- **Backend**: Appwrite as Backend-as-a-Service
- **Multi-tenancy**: Complete tenant isolation at database level
- **Security**: Role-based access control, data validation, secure session management

## Security

- All business data is isolated by `businessId`
- Role-based access control (RBAC)
- Input validation with Zod schemas
- Secure session management via Appwrite
- Environment-based configuration

## Deployment

The application is deployed on Vercel with automatic deployments from GitHub.

## License

ISC