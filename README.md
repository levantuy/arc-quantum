# Arc Quantum - DeFi Bridge Application

## Project Overview

Arc Quantum is a Next.js-based DeFi bridge application with blockchain integration capabilities. It includes:
- Admin panel for managing bridge configurations and tokens
- User authentication via Web3 wallet signatures
- Audit logging system
- Multi-chain token support
- PostgreSQL database with Prisma ORM

## Project Structure

```
arc-quantum/
├── app/                        # Next.js app directory
│   ├── admin/                 # Admin panel pages
│   ├── api/                   # API routes
│   ├── balance/               # Balance management pages
│   ├── bridge/                # Bridge pages
│   ├── history/               # Transaction history
│   ├── send/                  # Send transaction pages
│   ├── swap/                  # Swap pages
│   └── wallet/                # Wallet pages
├── components/                 # React components
│   ├── admin/                 # Admin-specific components
│   ├── balance/               # Balance components
│   ├── ui/                    # Shared UI components
│   └── [other features]/      # Feature-specific components
├── lib/                        # Utility libraries
│   ├── auth/                  # Authentication utilities
│   ├── db/                    # Database utilities
│   ├── security/              # Security utilities
│   └── arc/                   # Arc-specific utilities
├── prisma/                     # Prisma configuration
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── stores/                     # Zustand state management
├── types/                      # TypeScript types
├── middleware.ts              # Next.js middleware
├── next.config.js             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── .env                       # Environment variables
└── README.md                  # This file
```

## Prerequisites

- Node.js 18.17+ or 20.3+ or 21+
- npm or yarn
- PostgreSQL database
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/levantuy/arc-quantum.git
cd arc-quantum
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create or update the `.env` file with your configuration:

```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database?schema=arc_quantum"

# Internal audit secret for security events
INTERNAL_AUDIT_SECRET="your-secret-key"
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Run Database Migrations

```bash
npm run prisma:migrate
```

This will apply all pending migrations to your database schema.

### 6. (Optional) Seed Admin User

If you have a seed script configured:

```bash
npm run seed:admin
```

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create production build
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run seed:admin` - Seed initial admin user
- `npm test` - Run tests (currently not configured)

## Key Features

### Authentication
- Web3 wallet signature-based authentication
- JWT session management
- Admin role-based access control

### Admin Panel (`/admin`)
- Manage bridge configurations
- Configure tokens across chains
- View audit logs
- Real-time security event tracking

### Security
- Rate limiting on API endpoints
- Audit logging for all admin actions
- Security event monitoring
- Address validation for wallet operations

### Database
- PostgreSQL with Prisma ORM
- Automatic migrations
- Type-safe database queries

## Configuration Files

### `next.config.js`
Next.js configuration file with:
- Turbopack root directory configuration
- Environment variable setup

### `tsconfig.json`
TypeScript configuration with:
- Path aliases (`@/*` points to root directory)
- Strict type checking
- ES2020 target

### `prisma/schema.prisma`
Database schema defining:
- User model with admin roles
- Transaction tracking
- Token configuration
- Bridge configuration
- Audit logs
- Admin sessions

## API Routes

### Authentication
- `POST /api/auth/nonce` - Get nonce for wallet signature
- `POST /api/auth/verify` - Verify wallet signature and create session
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout and clear session

### Admin APIs
- `GET/POST /api/admin/tokens` - Manage token configurations
- `GET/POST /api/admin/bridge-config` - Manage bridge configurations
- `GET /api/admin/audit-logs` - View audit logs

### Internal
- `POST /api/internal/security-event` - Log security events

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Ensure all environment variables are set correctly in `.env`
2. Run `npm install` to ensure all dependencies are installed
3. Run `npm run prisma:generate` to regenerate Prisma client
4. Check that your PostgreSQL database is running and accessible

### Database Connection Issues

- Verify `DATABASE_URL` in `.env` is correct
- Ensure PostgreSQL is running
- Check that the database exists and is accessible
- Run migrations: `npm run prisma:migrate`

### Port Already in Use

If port 3000 is already in use, you can specify a different port:

```bash
npm run dev -- -p 3001
```

## Development Tips

### Path Aliases
The project uses TypeScript path aliases for cleaner imports:
- `@/components` - Components directory
- `@/lib` - Libraries directory
- `@/types` - Type definitions
- `@/stores` - Zustand stores

### Hot Reload
The development server supports hot module reloading. Changes to files will automatically refresh the browser.

### Database Schema Changes
When you modify `prisma/schema.prisma`:
1. Create a migration: `npm run prisma:migrate`
2. Follow the prompts to name your migration
3. The Prisma client will be automatically regenerated

## Technology Stack

- **Frontend**: React 19, Next.js 16 (App Router)
- **Styling**: Tailwind CSS (if configured in components)
- **State Management**: Zustand
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jose library)
- **Blockchain**: ethers.js
- **Build Tool**: Turbopack

## Contributing

1. Create a feature branch
2. Make your changes
3. Test the build: `npm run build`
4. Submit a pull request

## Security

- Never commit `.env` files with real secrets
- Always use environment variables for sensitive data
- Keep dependencies updated
- Run `npm audit` regularly and address vulnerabilities

## License

ISC

## Support

For issues or questions, please refer to the project's GitHub repository:
https://github.com/levantuy/arc-quantum/issues

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `INTERNAL_AUDIT_SECRET` | Secret key for internal audit events | `sk_xxxxxxxxxxxxxxxx` |

---

**Last Updated**: May 17, 2026
