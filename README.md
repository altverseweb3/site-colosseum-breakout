# Altverse: The Unified Crypto Interface

Altverse is a project inspired by the many pain points associated with various tools and features separated by different protocols, chains and dApps. Altverse aims to create a unified experience by offering exposure to some of the greatest tools on offer in Web3, in one centralized location. By establishing a seamless cross-chain framework supported by Wormhole and Mayan, we are able to expose protocols from all chains to any user, regardless of where their assets are kept.

![Screenshot 2025-05-17 at 12 42 04 pm](https://github.com/user-attachments/assets/9a957a44-b48a-471f-ae8d-3d493ffd8517)

Our platform does more than just aggregate protocols - we abstract away complexities, presenting one seamless experience across the best opportunities that DeFi and crypto utilities have to offer. For example, we enable cross-chain and cross-environment swaps, staking on EtherFi, borrowing on Aave, and we are looking to integrate many other useful tools.

![Screenshot 2025-05-17 at 12 42 17 pm](https://github.com/user-attachments/assets/1e1f56cf-474c-457a-8938-6b9baba7d94d)


## Quick links
- [Website](https://site-colosseum-breakout.vercel.app)

## `altverse-site`
This repository is the frontend component for our project. The Altverse frontend enables users to connect up to 3 different wallets simultaneously across a selection of EVM, Solana and Sui wallets, providing an interface for users from all different chains to swap and stake tokens across Web3 seamlessly.

## Tech stack
### Frontend
- [**NextJS**](https://nextjs.org/): our core framework
- [**Tailwind CSS**](https://tailwindcss.com/): for simple, elegant styling
- [**Zustand**](https://zustand.docs.pmnd.rs/getting-started/introduction): to persist a storage context across components, as well as across site refreshes
- [**Shadcn**](https://ui.shadcn.com/): for consistent elegant UI components
- [**Magic UI**](https://magicui.design/): to power the stunning animated visual components

### Web3
- [**Reown**](https://reown.com/): wallet kit to support a scalable selection of wallets across networks (currently used for Solana and EVM)
- [**Suiet**](https://kit.suiet.app/): wallet provider for the Sui network
- [**Mayan SDK**](https://www.npmjs.com/package/@mayanfinance/swap-sdk): the cross-chain SDK that just works

### DevOps
- [**Vercel**](https://vercel.com): for seamless automatic deployments
- [**Husky**](https://typicode.github.io/husky/): to add `pre-commit` and `pre-push` hooks to format and lint our repository

## How to run locally
```bash
# Install dependencies
npm install
# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view Altverse in your browser.


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

