/*
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as React from 'react';

import {
  Atlasmap,
  AtlasmapProvider,
  IAtlasmapProviderProps,
  IExternalDocumentProps,
  ParametersDialog,
  useAtlasmap,
} from '@atlasmap/atlasmap';
import { getCsvParameterOptions } from '@atlasmap/core';
import { Button, Modal, Text, TextContent } from '@patternfly/react-core';
import { RepositoryAtlasmapToolbar } from './RepositoryAtlasmapToolbar';
import { SchemaRegistryPicker } from './SchemaRegistryPicker';

export interface IDataMapperAdapterProps {
  documentId: string;
  mappingDefinitionId: number;
  inputDocuments: IExternalDocumentProps[];
  outputDocument?: IExternalDocumentProps;
  initialMappings?: string;
  baseMappingServiceUrl: string;
  baseJavaInspectionServiceUrl: string;
  baseXMLInspectionServiceUrl: string;
  baseJSONInspectionServiceUrl: string;
  baseCSVInspectionServiceUrl: string;
  onMappings(mappings: string): void;
}

export interface IParameter {
  name: string;
  label: string;
  value: string;
  boolean?: boolean;
  options?: IParameterOption[];
  enabled?: boolean;
  required?: boolean;
}

export const DataMapperAdapter: React.FunctionComponent<
  IDataMapperAdapterProps
> = ({
  documentId,
  mappingDefinitionId,
  inputDocuments,
  outputDocument,
  initialMappings,
  baseMappingServiceUrl,
  baseJavaInspectionServiceUrl,
  baseXMLInspectionServiceUrl,
  baseJSONInspectionServiceUrl,
  baseCSVInspectionServiceUrl,
  onMappings,
}) => {
  const hiddenToolbarItems = React.useMemo(() => {
    const fromEnv = process.env.REACT_APP_HIDE_TOOLBAR_ITEMS;
    let raw = fromEnv;
    if (!raw && typeof window !== 'undefined') {
      raw =
        new URLSearchParams(window.location.search).get('hideToolbarItems') ||
        undefined;
    }
    return new Set(
      (raw || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );
  }, []);

  const toolbarOptions = React.useMemo(
    () => ({
      showImportAtlasFileToolbarItem: false,
      showImportJarFileToolbarItem: false,
      showExportAtlasFileToolbarItem: false,
      showResetToolbarItem: false,
      showColumnMapperViewToolbarItem:
        !hiddenToolbarItems.has('views') &&
        !hiddenToolbarItems.has('columnview'),
      showMappingTableViewToolbarItem:
        !hiddenToolbarItems.has('views') &&
        !hiddenToolbarItems.has('tableview'),
      showNamespaceTableViewToolbarItem:
        !hiddenToolbarItems.has('views') &&
        !hiddenToolbarItems.has('namespaceview'),
      showToggleMappingPreviewToolbarItem: !hiddenToolbarItems.has('preview'),
      showToggleTypesToolbarItem: !hiddenToolbarItems.has('types'),
      showToggleMappedFieldsToolbarItem:
        !hiddenToolbarItems.has('mapped') &&
        !hiddenToolbarItems.has('mappedfields'),
      showToggleUnmappedFieldsToolbarItem:
        !hiddenToolbarItems.has('unmapped') &&
        !hiddenToolbarItems.has('unmappedfields'),
      showAddNewMappingToolbarItem:
        !hiddenToolbarItems.has('add') &&
        !hiddenToolbarItems.has('addmapping') &&
        !hiddenToolbarItems.has('plus'),
      extraToolbarContent: <RepositoryAtlasmapToolbar />,
    }),
    [hiddenToolbarItems],
  );

  const registryBaseUrl =
    process.env.REACT_APP_SCHEMA_REGISTRY_BASE_URL?.trim() || '';

  const RegistryHeaderAction: React.FC<{
    isSource: boolean;
  }> = ({ isSource }) => {
    const { configModel, importInstanceSchema, documentExists } = useAtlasmap();
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [pendingFile, setPendingFile] = React.useState<File | null>(null);
    const confirmResolver = React.useRef<(ok: boolean) => void>();

    const handleConfirm = React.useCallback(() => {
      if (confirmResolver.current) {
        confirmResolver.current(true);
      }
      setConfirmOpen(false);
      setPendingFile(null);
    }, []);

    const handleCancel = React.useCallback(() => {
      if (confirmResolver.current) {
        confirmResolver.current(false);
      }
      setConfirmOpen(false);
      setPendingFile(null);
    }, []);

    const shouldConfirmImport = React.useCallback(
      async (file: File) => {
        const needsConfirm = documentExists && documentExists(file, isSource);
        if (!needsConfirm) {
          return true;
        }
        setPendingFile(file);
        setConfirmOpen(true);
        return new Promise<boolean>((resolve) => {
          confirmResolver.current = resolve;
        });
      },
      [documentExists, isSource],
    );

    const handleImport = React.useCallback(
      async (file: File) => {
        if (!importInstanceSchema || !configModel) {
          throw new Error('Import is unavailable.');
        }
        await importInstanceSchema(file, configModel, isSource, true);
      },
      [configModel, importInstanceSchema, isSource],
    );

    return (
      <>
        <SchemaRegistryPicker
          isSource={isSource}
          baseUrl={registryBaseUrl}
          shouldConfirmImport={shouldConfirmImport}
          onImport={handleImport}
        />
        <Modal
          title="Override existing document?"
          isOpen={confirmOpen}
          onClose={handleCancel}
          variant="small"
          actions={[
            <Button key="confirm" variant="primary" onClick={handleConfirm}>
              OK
            </Button>,
            <Button key="cancel" variant="link" onClick={handleCancel}>
              Cancel
            </Button>,
          ]}
        >
          <TextContent>
            <Text>
              A document is already loaded. Override with the selection from the
              Schema Registry?
            </Text>
            {pendingFile ? (
              <Text component="small">New document: {pendingFile.name}</Text>
            ) : null}
          </TextContent>
        </Modal>
      </>
    );
  };

  const externalDocument = React.useMemo(() => {
    const external: IAtlasmapProviderProps['externalDocument'] = {
      documentId,
      mappingDefinitionId,
      initialMappings,
      inputDocuments,
    };
    if (outputDocument) {
      external.outputDocument = outputDocument;
    }
    return external;
  }, [
    documentId,
    mappingDefinitionId,
    initialMappings,
    inputDocuments,
    outputDocument,
  ]);
  return (
    <AtlasmapProvider
      logLevel={'warn'}
      baseMappingServiceUrl={baseMappingServiceUrl}
      baseJSONInspectionServiceUrl={baseJSONInspectionServiceUrl}
      baseJavaInspectionServiceUrl={baseJavaInspectionServiceUrl}
      baseXMLInspectionServiceUrl={baseXMLInspectionServiceUrl}
      baseCSVInspectionServiceUrl={baseCSVInspectionServiceUrl}
      externalDocument={externalDocument}
      onMappingChange={onMappings}
    >
      <Atlasmap
        allowImport={true}
        allowExport={true}
        allowDelete={true}
        allowCustomJavaClasses={false}
        toolbarOptions={toolbarOptions}
        sourceHeaderActions={[<RegistryHeaderAction isSource key="sr-src" />]}
        targetHeaderActions={[
          <RegistryHeaderAction isSource={false} key="sr-tgt" />,
        ]}
      />
    </AtlasmapProvider>
  );
};

export interface IParameterOption {
  label: string;
  value: string;
}

export interface IParameterDefinition {
  name: string;
  label: string;
  value: string;
  boolean?: boolean;
  options?: IParameterOption[];
  hidden?: boolean;
  required?: boolean;
  enabled?: boolean;
}

export interface IParameters {
  [name: string]: string;
}

export const DataShapeParametersDialog: React.FunctionComponent<{
  title: string;
  shown: boolean;
  parameterDefinition: IParameterDefinition[];
  parameters?: IParameters;
  onConfirm: (parameters: IParameters) => void;
  onCancel: () => void;
}> = ({
  title,
  shown,
  parameterDefinition,
  parameters,
  onConfirm,
  onCancel,
}) => {
  const parametersToParameterArray = (given?: IParameters): IParameter[] => {
    if (given === undefined) {
      return [];
    }

    return parameterDefinition.reduce((acc, defn) => {
      if (defn.name in given) {
        acc.push({ ...defn, value: given[defn.name] });
      }

      return acc;
    }, [] as IParameter[]);
  };

  const parameterArrayToParams = (given: IParameter[]): IParameters => {
    return given.reduce((acc: any, param) => {
      acc[param.name] = param.value;

      return acc;
    }, {});
  };

  // we wish to maintain the interface between usage of DataShapeParametersDialog
  // and AtlasMap, and hide any idiosyncrasies, to `onConfirm` we wish to provide
  // only key-value IParameters choosen by the user, while maintaining the state
  // of ParametersDialog in AtlasMap, as noted above
  const handleConfirm = (given: IParameter[]) => {
    setParams(parameterArrayToParams(given));
    onConfirm(parameterArrayToParams(given));
  };

  const [params, setParams] = React.useState(parameters);

  return (
    <ParametersDialog
      isOpen={shown}
      title={title}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      initialParameters={parametersToParameterArray(params)}
      parameters={parameterDefinition}
    />
  );
};

export const atlasmapCSVParameterOptions = getCsvParameterOptions;
