import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// JSDOM has no viewport scrolling; browser checks verify the actual position.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
});
