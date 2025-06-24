# LeadFlow Workspace Structure

## Core Application
```
src/
├── app/                    # Next.js app router pages
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
├── types/                  # TypeScript type definitions
└── ai/                     # AI/Genkit integration
```

## ✅ Recently Cleaned
- Removed 22 RA-related setup scripts
- Removed 5 HTML debug files  
- Removed 2 backup package-lock files
- **Total cleanup:** 29 unused files

## Configuration
```
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── eslint.config.js        # ESLint config
├── jest.config.js          # Jest testing config
└── playwright.config.ts    # E2E testing config
```

## Firebase
```
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── storage.rules           # Firebase Storage rules
├── functions/              # Cloud Functions
└── auth_export.json        # Auth export data
```

## Documentation
```
docs/
├── blueprint.md
├── job-acceptance-*.md
├── push-notifications-setup.md
└── verification-checkbox-fix.md
```

## Scripts & Tools
```
├── scripts/                # Build and deployment scripts
├── *.js                   # Admin/setup scripts
├── *.html                 # Debug/testing tools
└── *.sh                   # Shell scripts
```
