## Configuration Directory
This directory contains centralized configuration files for various aspects of the Altverse dApp. The `/config` pattern is a widely adopted practice in Next.js applications and should be used for our single source of truth for application-wide settings, constants, and configuration objects.

### Current Configuration
#### Tab Configuration (tabs.ts)
The tab configuration defines the structure and properties of our application's main navigation. It provides:

- A single source of truth for tab labels and properties
- Type-safe configuration using TypeScript
- Centralized management of tab states (enabled/disabled)
- Easy modification of tab properties and labels
- Maintainable tooltip messages for disabled states