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
import {
  Button,
  Form,
  FormGroup,
  Popover,
  Select,
  SelectOption,
  Spinner,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { RepositoryAtlasmapToolbar } from './RepositoryAtlasmapToolbar';

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
      showToggleMappingPreviewToolbarItem:
        !hiddenToolbarItems.has('preview'),
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

  const SchemaRegistryAction: React.FC<{
    isSource: boolean;
    onImportDocument?: (file: File) => void;
    documentsCount?: number;
  }> = ({ isSource, onImportDocument, documentsCount }) => {
    const { configModel, importInstanceSchema, documentExists } =
      useAtlasmap();
    const [isOpen, setIsOpen] = React.useState(false);
    const [artifacts, setArtifacts] = React.useState<any[]>([]);
    const [groupedArtifacts, setGroupedArtifacts] = React.useState<
      Record<string, any[]>
    >({});
    const [currentGroup, setCurrentGroup] = React.useState<string>();
    const [versions, setVersions] = React.useState<string[]>([]);
    const [selectedArtifactId, setSelectedArtifactId] = React.useState<string>();
    const [selectedVersion, setSelectedVersion] = React.useState<string>();
    const [loadingArtifacts, setLoadingArtifacts] = React.useState(false);
    const [loadingVersions, setLoadingVersions] = React.useState(false);
    const [loadingImport, setLoadingImport] = React.useState(false);
    const [versionSelectOpen, setVersionSelectOpen] = React.useState(false);
    const [error, setError] = React.useState<string>();

    const baseUrl =
      process.env.REACT_APP_SCHEMA_REGISTRY_BASE_URL?.trim() || '';

    const loadArtifacts = React.useCallback(async () => {
      setError(undefined);
      setLoadingArtifacts(true);
      try {
        const search = await fetch(
          `${baseUrl}/apis/registry/v3/search/artifacts?orderby=groupId`,
        );
        if (!search.ok) {
          throw new Error(await search.text());
        }
        const searchResult = await search.json();
        const fetchedArtifacts = searchResult.artifacts || searchResult.items || [];
        setArtifacts(fetchedArtifacts);
        const grouped = fetchedArtifacts.reduce(
          (acc: Record<string, any[]>, art: any) => {
            const g = art.groupId || 'default';
            acc[g] = acc[g] || [];
            acc[g].push(art);
            return acc;
          },
          {},
        );
        setGroupedArtifacts(grouped);
        setCurrentGroup(undefined);
        setSelectedArtifactId(undefined);
        setSelectedVersion(undefined);
        setVersions([]);
      } catch (e: any) {
        setError(e?.message || 'Failed to load artifacts');
      } finally {
        setLoadingArtifacts(false);
      }
    }, [baseUrl]);

    const loadVersions = React.useCallback(
      async (artifact: any) => {
        if (!artifact) {
          setVersions([]);
          return;
        }
        setError(undefined);
        setLoadingVersions(true);
        try {
          const groupId = artifact.groupId || 'default';
          const artifactId = artifact.id || artifact.artifactId;
          const versionsRes = await fetch(
            `${baseUrl}/apis/registry/v3/groups/${encodeURIComponent(
              groupId,
            )}/artifacts/${encodeURIComponent(artifactId)}/versions`,
          );
          if (!versionsRes.ok) {
            throw new Error(await versionsRes.text());
          }
          const versionsJson = await versionsRes.json();
          const rawVersions =
            versionsJson.versions || versionsJson.items || versionsJson || [];
          const normalized = Array.isArray(rawVersions)
            ? rawVersions.map((v: any) => `${v.version || v}`)
            : [];
          setVersions(normalized);
          if (normalized.length) {
            setSelectedVersion(normalized[normalized.length - 1]);
          }
        } catch (e: any) {
          setError(e?.message || 'Failed to load versions');
          setVersions([]);
        } finally {
          setLoadingVersions(false);
        }
      },
      [baseUrl],
    );

    const groups = React.useMemo(
      () => Object.keys(groupedArtifacts).sort(),
      [groupedArtifacts],
    );

    React.useEffect(() => {
      if (!isOpen) {
        return;
      }
      loadArtifacts();
    }, [isOpen, loadArtifacts]);

    React.useEffect(() => {
      const artifact = artifacts.find(
        (a) =>
          `${a.groupId || 'default'}::${a.id || a.artifactId}` ===
          selectedArtifactId,
      );
      loadVersions(artifact);
    }, [artifacts, selectedArtifactId, loadVersions]);

    const handleLoad = async () => {
      if (!importInstanceSchema || !configModel) {
        setError('Import is unavailable.');
        return;
      }
      const artifact = artifacts.find(
        (a) =>
          `${a.groupId || 'default'}::${a.id || a.artifactId}` ===
          selectedArtifactId,
      );
      if (!artifact) {
        setError('Select an artifact to load');
        return;
      }
      const versionChoice = selectedVersion || 'latest';

      if (documentsCount && documentsCount > 0) {
        const proceed = window.confirm(
          'A document is already loaded. Override with selection from the Schema Registry?',
        );
        if (!proceed) {
          return;
        }
      }

      setLoadingImport(true);
      setError(undefined);
      try {
        const groupId = artifact.groupId || 'default';
        const artifactId = artifact.id || artifact.artifactId;
        const versionPath =
          versionChoice && versionChoice !== 'latest'
            ? `/versions/${encodeURIComponent(versionChoice)}`
            : '/versions/latest';
        const artifactRes = await fetch(
          `${baseUrl}/apis/registry/v3/groups/${encodeURIComponent(
            groupId,
          )}/artifacts/${encodeURIComponent(artifactId)}${versionPath}/content`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );
        if (!artifactRes.ok) {
          throw new Error(await artifactRes.text());
        }
        const blob = await artifactRes.blob();
        const mime = blob.type || artifact.contentType || '';
        const nameHint = artifact.name || artifactId;
        const looksXml =
          mime.includes('xml') ||
          nameHint.toLowerCase().endsWith('.xsd') ||
          nameHint.toLowerCase().includes('xml');
        const looksJson =
          mime.includes('json') ||
          nameHint.toLowerCase().endsWith('.json') ||
          nameHint.toLowerCase().includes('json');
        const ext = looksXml ? 'xsd' : looksJson ? 'json' : 'json';
        const filename = `${nameHint}${
          versionPath ? `-${versionChoice}` : ''
        }.${ext}`;
        const fileType = looksXml
          ? 'application/xml'
          : 'application/schema+json';
        const file = new File([blob], filename, { type: fileType });
        if (documentsCount && documentsCount > 0) {
          const proceed = window.confirm(
            'A document is already loaded. Override with selection from the Schema Registry?',
          );
          if (!proceed) {
            return;
          }
        }
        const exists = documentExists(file, isSource);
        if (exists) {
          const proceed = window.confirm(
            'A document with the same name exists. Import another copy?',
          );
          if (!proceed) {
            return;
          }
        }
        await importInstanceSchema(file, configModel, isSource, true);
        setIsOpen(false);
      } catch (e: any) {
        setError(`Unable to load from schema registry: ${e?.message || e}`);
      } finally {
        setLoadingImport(false);
      }
    };

    return (
      <Popover
        isVisible={isOpen}
        shouldClose={() => setIsOpen(false)}
        position="bottom-start"
        headerContent="Load from Schema Registry"
        hasAutoWidth
        bodyContent={
          <Form
            isWidthLimited
            style={{
              minWidth: 340,
              maxWidth: 420,
              maxHeight: 520,
              overflowY: 'auto',
              paddingRight: 8,
            }}
          >
            <FormGroup label="Artifact" fieldId="sr-artifact">
              {loadingArtifacts ? (
                <Spinner size="md" />
              ) : !groups.length ? (
                <Text component={TextVariants.small}>No artifacts available</Text>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {!currentGroup &&
                    groups.map((group) => (
                      <Button
                        key={group}
                        variant="link"
                        onClick={() => {
                          setCurrentGroup(group);
                          setSelectedArtifactId(undefined);
                          setSelectedVersion(undefined);
                          setVersions([]);
                        }}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        {group}
                      </Button>
                    ))}
                  {currentGroup && (
                    <>
                      <Button
                        variant="link"
                        onClick={() => {
                          setCurrentGroup(undefined);
                          setSelectedArtifactId(undefined);
                          setSelectedVersion(undefined);
                          setVersions([]);
                        }}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        &larr; Back to groups
                      </Button>
                      {(groupedArtifacts[currentGroup] || []).map((a) => {
                        const value = `${a.groupId || 'default'}::${a.id || a.artifactId}`;
                        const label = `${a.name || a.id || a.artifactId}`;
                        return (
                          <Button
                            key={value}
                            variant="link"
                            onClick={() => {
                              setSelectedArtifactId(value);
                              setSelectedVersion(undefined);
                            }}
                            style={{ justifyContent: 'flex-start' }}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </FormGroup>
            <FormGroup label="Version" fieldId="sr-version">
              {loadingVersions ? (
                <Spinner size="md" />
              ) : (
                <Select
                  isOpen={versionSelectOpen}
                  onToggle={setVersionSelectOpen}
                  selections={selectedVersion}
                  onSelect={(_, value) => {
                    setSelectedVersion(value as string);
                    setVersionSelectOpen(false);
                  }}
                  placeholderText={
                    versions.length ? 'Select a version' : 'No versions available'
                  }
                  isDisabled={!versions.length}
                >
                  {versions.map((v) => (
                    <SelectOption key={v} value={v} />
                  ))}
                </Select>
              )}
            </FormGroup>
            {error && (
              <Text
                component={TextVariants.small}
                style={{ color: 'var(--pf-global--danger-color--100)' }}
              >
                {error}
              </Text>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button
                variant="primary"
                onClick={handleLoad}
                isDisabled={
                  !selectedArtifactId ||
                  loadingImport ||
                  loadingArtifacts ||
                  loadingVersions
                }
                isLoading={loadingImport}
              >
                Load
              </Button>
              <Button
                variant="link"
                onClick={() => setIsOpen(false)}
                isDisabled={loadingImport}
              >
                Cancel
              </Button>
            </div>
          </Form>
        }
        footerContent={null}
        enableFlip
      >
        <Button
          variant="control"
          onClick={() => setIsOpen((v) => !v)}
          isDisabled={loadingImport}
          aria-label={`Load from Schema Registry (${isSource ? 'source' : 'target'})`}
          style={{ marginLeft: 8 }}
        >
          {loadingImport ? 'Loading...' : 'Load from Schema Registry'}
        </Button>
      </Popover>
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
        sourceHeaderActions={[<SchemaRegistryAction isSource key="sr-src" />]}
        targetHeaderActions={[<SchemaRegistryAction isSource={false} key="sr-tgt" />]}
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
