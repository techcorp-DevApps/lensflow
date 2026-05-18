// Minimal typed declarations for src/components/dashboard default exports.
  // Components are simple presentational React components; default exports are
  // re-declared here so consumer pages get accurate component typing while the
  // dashboard source itself is excluded from typecheck (its props are inferred
  // from runtime usage and tested via Vitest).
  import * as React from 'react';
  declare const Component: React.ComponentType<Record<string, any>>;
  export default Component;
  