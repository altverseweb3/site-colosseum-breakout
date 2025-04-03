# Altverse Site

A Next.js application for the Altverse protocol interface.

## Tech Stack
- Next.js
- React
- TypeScript
- TailwindCSS
- shadcn/ui Components

## Local Development
```bash
# Install dependencies
npm install
# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Suggested File Tree

```
├── app/
│   ├── page.tsx
│   ├── landing.tsx
│   ├── dapp/
│   │   ├── layout.tsx
│   │   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── layout/
│   │   ├── MainNav.tsx
│   │   └── SiteHeader.tsx
│   └── modals/
│       ├── Swap.tsx
│       ├── Bridge.tsx
│       ├── Earn.tsx
│       ├── Lend.tsx
│       └── Dashboard.tsx
├── lib/
│   ├── constants.ts
│   ├── formatters.ts
│   └── utils.ts
├── store/
│   ├── useWeb3Store.ts
│   ├── useUIStore.ts
│   └── useWallet.ts
└── types/
    └── index.ts
```