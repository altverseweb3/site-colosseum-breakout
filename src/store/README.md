## Storage Context

Storage context is maintained using [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction). The use of multiple contexts follows the Single Responsibility Principle and allows for better performance and code organisation.

### UI Storage `ui_store.ts`
This is where we store any context related to the users current session regarding UI such as selected tabs, options, and preferences.

### Web3 Storage `web3_store.ts`
This is where we store any context related to a users web3 connections such as connected wallet addresses, transactions, assets, etc.