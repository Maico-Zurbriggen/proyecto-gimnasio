import { BrowserRouter } from 'react-router-dom';

import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
import { ScrollToTop } from './app/router/ScrollToTop';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <ScrollToTop />
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}
