# Altverse: The Unified Crypto Interface

## `altverse-site`
This repository is the frontend component for our project. The Altverse frontend enables users to connect up to 3 different wallets simultaneously across a selection of EVM, Solana and Sui wallets, providing an interface for users from all different chains to swap and stake tokens across Web3 seamlessly.

## Tech stack
### Frontend
- **NextJS**: our core framework
- **Tailwind CSS**: for simple, elegant styling
- **Zustand**: to persist a storage context across components, as well as across site refreshes
- **Shadcn**: for consistent elegant UI components
- **Magic UI**: to power the stunning animated visual components

### Web3
- **Reown**: wallet kit to support a scalable selection of wallets across networks (currently used for Solana and EVM)
- **Suiet**: wallet provider for the Sui network
- **Mayan SDK**: our selected cross chain swap SDK

### DevOps
- **Vercel**: for seamless automatic deployments
- **Husky**: to add `pre-commit` and `pre-push` hooks to format and lint our repository

## How to run locally
```bash
# Install dependencies
npm install
# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the Altverse in your browser.


## Repository Structure

Below is a simplified explanation of our repository structure:
```
site/
├── public/ # contains all our images and token metadata
│   ├── images/
│   ├── protocols/
│   ├── tokens/
│   └── wallets/
├── src/
│   ├── api/    # api for our backend
│   ├── app/    # landing page
│   │   ├── (dapp)/     # contains pages inside the dapp
│   │   │   ├── borrow/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── swap/
│   │   │       └── page.tsx
│   │   ├── favicon.ico
│   │   ├── ...
│   ├── components/
│   │   ├── layout/ # core visual components used across the site
│   │   │   ├── MainNav.tsx
│   │   │   ├── SiteFooter.tsx
│   │   │   ├── ...
│   │   └── ui/     # reusable visual components
│   │       ├── Accordion.tsx
│   │       ├── AlertDialog.tsx
│   │       ├── ...
│   ├── config/     # site configuration (e.g. what chains we support)
│   │   ├── chains.ts
│   │   └── tabs.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── store/      # Zustand storage contexts
│   │   ├── uiStore.ts
│   │   └── web3Store.ts
│   ├── types/      # reusable type definitions
│   │   ├── ui.ts
│   │   ├── web3.ts
│   │   └── window.d.ts
│   └── utils/      # reusable helper/wrapper functions
│       ├── chainMethods.ts
│       ├── mayanSwapMethods.ts
│       ├── ...
```

