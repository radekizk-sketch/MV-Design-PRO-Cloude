import { useEffect, useState } from 'react';

import { DesignerPage } from './designer/DesignerPage';
import { ProofInspectorPage } from './proof-inspector';

function App() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (route === '#proof') {
    return <ProofInspectorPage />;
  }

  return <DesignerPage />;
}

export default App;
