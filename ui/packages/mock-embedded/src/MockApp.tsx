/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { Brand, Page, PageHeader, PageSection } from '@patternfly/react-core';

import { DataMapperAdapter } from './DataMapperAdapter';
import React from 'react';
import atlasmapLogo from './logo-horizontal-darkbg.png';

let receivedMappings: string;

const mappingIdStorageKey = 'atlasmap.mock.mappingId';

const MockApp: React.FC = () => {
  const mappingDefinitionId = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return Math.floor(Math.random() * 1000000);
    }
    const existing = window.sessionStorage.getItem(mappingIdStorageKey);
    if (existing) {
      return Number(existing);
    }
    const generated =
      Math.floor(Date.now() % 2000000000) +
      Math.floor(Math.random() * 1000);
    window.sessionStorage.setItem(
      mappingIdStorageKey,
      generated.toString(),
    );
    return generated;
  }, []);

  return (
    <Page
      header={
        <PageHeader
          logo={
            <>
              <Brand
                src={atlasmapLogo}
                alt="AtlasMap Data Mapper UI"
                height="40"
              />
            </>
          }
          style={{ minHeight: 40 }}
        />
      }
    >
      <PageSection
        variant={'light'}
        padding={{ default: 'noPadding' }}
        isFilled={true}
      >
        <DataMapperAdapter
          mappingDefinitionId={mappingDefinitionId}
          baseJavaInspectionServiceUrl={'/v2/atlas/java/'}
          baseXMLInspectionServiceUrl={'/v2/atlas/xml/'}
          baseJSONInspectionServiceUrl={'/v2/atlas/json/'}
          baseCSVInspectionServiceUrl={'/v2/atlas/csv/'}
          baseMappingServiceUrl={'/v2/atlas/'}
          onMappings={function (mappings: string): void {
            receivedMappings = mappings;
          }}
          documentId={`MockDocuments-${mappingDefinitionId}`}
          inputDocuments={[]}
        />
      </PageSection>
      <input type="hidden" value={receivedMappings} />
    </Page>
  );
};

export default MockApp;
