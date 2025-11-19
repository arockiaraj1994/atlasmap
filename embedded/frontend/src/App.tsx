import { Atlasmap, AtlasmapProvider } from '@atlasmap/atlasmap';
import React from 'react';

const baseUrl =
  import.meta.env.VITE_ATLASMAP_BASE_URL ?? 'http://127.0.0.1:8686/v2/atlas/';
const workspaceId = import.meta.env.VITE_ATLASMAP_WORKSPACE ?? 'standalone';

export default function App() {
  return (
    <div className="atlasmap-shell">
      <header>
        <h1>Embedded AtlasMap demo</h1>
        <p>Backend: {baseUrl}</p>
      </header>
      <section className="atlasmap-content">
        <AtlasmapProvider
          baseMappingServiceUrl={baseUrl}
          baseJavaInspectionServiceUrl={baseUrl}
          baseXMLInspectionServiceUrl={baseUrl}
          baseJSONInspectionServiceUrl={baseUrl}
          baseCSVInspectionServiceUrl={baseUrl}
          logLevel="info"
          workspaceId={workspaceId}
        >
          <Atlasmap />
        </AtlasmapProvider>
      </section>
    </div>
  );
}
