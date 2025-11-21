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
import {
  ArtifactSummary,
  fetchArtifactContent,
  fetchArtifacts,
  fetchVersions,
} from './schemaRegistryClient';

interface SchemaRegistryPickerProps {
  isSource: boolean;
  onImport: (file: File) => Promise<void>;
  shouldConfirmImport?: (file: File) => Promise<boolean>;
  baseUrl?: string;
}

export const SchemaRegistryPicker: React.FC<SchemaRegistryPickerProps> = ({
  isSource,
  baseUrl = '',
  onImport,
  shouldConfirmImport,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [groupedArtifacts, setGroupedArtifacts] = React.useState<
    Record<string, ArtifactSummary[]>
  >({});
  const [currentGroup, setCurrentGroup] = React.useState<string>();
  const [selectedArtifactId, setSelectedArtifactId] = React.useState<string>();
  const [versions, setVersions] = React.useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = React.useState<string>();
  const [loadingArtifacts, setLoadingArtifacts] = React.useState(false);
  const [loadingVersions, setLoadingVersions] = React.useState(false);
  const [loadingImport, setLoadingImport] = React.useState(false);
  const [versionSelectOpen, setVersionSelectOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const groups = React.useMemo(
    () => Object.keys(groupedArtifacts).sort(),
    [groupedArtifacts],
  );

  const resolveSelection = React.useCallback(():
    | ArtifactSummary
    | undefined => {
    if (!selectedArtifactId || !currentGroup) {
      return undefined;
    }
    return (groupedArtifacts[currentGroup] || []).find(
      (a) =>
        `${a.groupId || 'default'}::${a.artifactId}` === selectedArtifactId,
    );
  }, [currentGroup, groupedArtifacts, selectedArtifactId]);

  const loadArtifacts = React.useCallback(async () => {
    setError(undefined);
    setLoadingArtifacts(true);
    try {
      const results = await fetchArtifacts(baseUrl);
      const grouped = results.reduce(
        (acc: Record<string, ArtifactSummary[]>, art: ArtifactSummary) => {
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
    async (artifact?: ArtifactSummary) => {
      if (!artifact) {
        setVersions([]);
        return;
      }
      setError(undefined);
      setLoadingVersions(true);
      try {
        const vs = await fetchVersions(
          baseUrl,
          artifact.groupId || 'default',
          artifact.artifactId,
        );
        setVersions(vs);
        if (vs.length) {
          setSelectedVersion(vs[vs.length - 1]);
        } else {
          setSelectedVersion(undefined);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load versions');
        setVersions([]);
        setSelectedVersion(undefined);
      } finally {
        setLoadingVersions(false);
      }
    },
    [baseUrl],
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    loadArtifacts();
  }, [isOpen, loadArtifacts]);

  React.useEffect(() => {
    loadVersions(resolveSelection());
  }, [resolveSelection, loadVersions]);

  const handleLoad = async () => {
    const artifact = resolveSelection();
    if (!artifact) {
      setError('Select an artifact to load');
      return;
    }
    setLoadingImport(true);
    setError(undefined);
    try {
      const file = await fetchArtifactContent(
        baseUrl,
        artifact,
        selectedVersion || 'latest',
      );
      if (shouldConfirmImport) {
        const ok = await shouldConfirmImport(file);
        if (!ok) {
          setLoadingImport(false);
          return;
        }
      }
      await onImport(file);
      setIsOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Unable to load from schema registry');
    } finally {
      setLoadingImport(false);
    }
  };

  const triggerLabel = 'Load from Schema Registry';

  return (
    <Popover
      isVisible={isOpen}
      shouldClose={() => setIsOpen(false)}
      position="bottom-start"
      headerContent="Load from Schema Registry"
      hasAutoWidth
      bodyContent={
        <Form className="schema-registry-form">
          <FormGroup label="Artifact" fieldId="sr-artifact">
            {loadingArtifacts ? (
              <Spinner size="md" />
            ) : !groups.length ? (
              <Text component={TextVariants.small}>No artifacts available</Text>
            ) : (
              <div className="schema-registry-list">
                {!currentGroup &&
                  groups.map((group) => (
                    <Button
                      key={group}
                      variant="link"
                      className="schema-registry-btn"
                      onClick={() => {
                        setCurrentGroup(group);
                        setSelectedArtifactId(undefined);
                        setSelectedVersion(undefined);
                        setVersions([]);
                      }}
                    >
                      {group}
                    </Button>
                  ))}
                {currentGroup && (
                  <>
                    <Button
                      variant="link"
                      className="schema-registry-back"
                      onClick={() => {
                        setCurrentGroup(undefined);
                        setSelectedArtifactId(undefined);
                        setSelectedVersion(undefined);
                        setVersions([]);
                      }}
                    >
                      &larr; Back to groups
                    </Button>
                    {(groupedArtifacts[currentGroup] || []).map((a) => {
                      const value = `${a.groupId || 'default'}::${
                        a.artifactId
                      }`;
                      const label = `${a.name || a.artifactId}`;
                      const selected = selectedArtifactId === value;
                      return (
                        <Button
                          key={value}
                          variant="link"
                          className={`schema-registry-btn${
                            selected ? ' selected' : ''
                          }`}
                          onClick={() => {
                            setSelectedArtifactId(value);
                            setSelectedVersion(undefined);
                          }}
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
        aria-label={`Load from Schema Registry (${
          isSource ? 'source' : 'target'
        })`}
        style={{ marginLeft: 8 }}
      >
        {triggerLabel}
      </Button>
    </Popover>
  );
};
