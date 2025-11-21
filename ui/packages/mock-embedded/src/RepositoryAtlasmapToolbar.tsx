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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtlasmap } from '@atlasmap/atlasmap';
import { ErrorInfo, ErrorLevel, ErrorScope, ErrorType } from '@atlasmap/core';
import {
  Alert,
  AlertVariant,
  Bullseye,
  Button,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  List,
  ListItem,
  Modal,
  Radio,
  Spinner,
  TextInput,
  Title,
  ToolbarGroup,
} from '@patternfly/react-core';
import {
  ExportIcon,
  FolderOpenIcon,
  ImportIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { useFilePicker } from 'react-sage';

interface RepositoryConfig {
  configured: boolean;
  directory?: string | null;
}

interface RepositoryFileEntry {
  name: string;
  size: number;
  lastModified: string;
}

const ADM_ENDPOINT = '/mock/adm';

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const RepositoryAtlasmapToolbar: React.FC = () => {
  const { importADMArchiveFile, importJarFile, resetAtlasmap, configModel } =
    useAtlasmap();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [config, setConfig] = useState<RepositoryConfig>();
  const [configLoading, setConfigLoading] = useState(true);
  const [files, setFiles] = useState<RepositoryFileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>();
  const [isImporting, setImporting] = useState(false);
  const [isExporting, setExporting] = useState(false);
  const [exportName, setExportName] = useState('atlasmap-mapping');
  const {
    files: jarFiles,
    onClick: openJarPicker,
    HiddenFileInput,
  } = useFilePicker({ maxFileSize: 1 });

  const notify = useCallback(
    (message: string, level: ErrorLevel, type: ErrorType) => {
      configModel.errorService.addError(
        new ErrorInfo({
          message,
          level,
          scope: ErrorScope.APPLICATION,
          type,
        }),
      );
    },
    [configModel],
  );

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await fetch(`${ADM_ENDPOINT}/config`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: RepositoryConfig = await response.json();
      setConfig(data);
    } catch (error) {
      notify(
        'Unable to load ADM repository configuration.',
        ErrorLevel.ERROR,
        ErrorType.INTERNAL,
      );
    } finally {
      setConfigLoading(false);
    }
  }, [notify]);

  const isRepositoryConfigured = Boolean(config?.configured);

  const loadFiles = useCallback(async () => {
    if (!isRepositoryConfigured) {
      setFiles([]);
      setSelectedFile(undefined);
      return;
    }
    setFilesLoading(true);
    try {
      const response = await fetch(`${ADM_ENDPOINT}/files`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: RepositoryFileEntry[] = await response.json();
      setFiles(data);
      if (data.length && !data.find((entry) => entry.name === selectedFile)) {
        setSelectedFile(data[0].name);
      }
    } catch (error) {
      notify(
        'Unable to load ADM files from the configured repository.',
        ErrorLevel.ERROR,
        ErrorType.INTERNAL,
      );
    } finally {
      setFilesLoading(false);
    }
  }, [isRepositoryConfigured, notify, selectedFile]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (isRepositoryConfigured) {
      loadFiles();
    }
  }, [isRepositoryConfigured, loadFiles]);

  useEffect(() => {
    if (jarFiles?.length === 1) {
      importJarFile(jarFiles[0]);
      setDropdownOpen(false);
    }
  }, [jarFiles, importJarFile]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      return;
    }
    setImporting(true);
    try {
      const response = await fetch(
        `${ADM_ENDPOINT}/files/${encodeURIComponent(selectedFile)}`,
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const file = new File([blob], selectedFile, {
        type: 'application/octet-stream',
      });
      await importADMArchiveFile(file);
      notify(
        `Imported ${selectedFile} from the repository.`,
        ErrorLevel.INFO,
        ErrorType.USER,
      );
      setImportModalOpen(false);
    } catch (error) {
      notify(
        `Unable to import ${selectedFile} from the repository.`,
        ErrorLevel.ERROR,
        ErrorType.INTERNAL,
      );
    } finally {
      setImporting(false);
      setDropdownOpen(false);
    }
  }, [importADMArchiveFile, notify, selectedFile]);

  const handleExport = useCallback(async () => {
    if (!isRepositoryConfigured) {
      return;
    }
    setExporting(true);
    try {
      let filename = exportName.trim();
      if (!filename.endsWith('.adm')) {
        filename = `${filename}.adm`;
      }
      await configModel.fileService.updateDigestFile();
      const admBytes = await configModel.fileService.getCurrentADMArchive();
      if (!admBytes) {
        throw new Error('ADM archive is not available');
      }
      const body = new Blob([admBytes], {
        type: 'application/octet-stream',
      });
      const response = await fetch(
        `${ADM_ENDPOINT}/files/${encodeURIComponent(filename)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body,
        },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      notify(
        `Saved ${filename} to the repository.`,
        ErrorLevel.INFO,
        ErrorType.USER,
      );
      setExportModalOpen(false);
      loadFiles();
    } catch (error) {
      notify(
        'Unable to export the current mapping to the repository.',
        ErrorLevel.ERROR,
        ErrorType.INTERNAL,
      );
    } finally {
      setExporting(false);
      setDropdownOpen(false);
    }
  }, [configModel, exportName, isRepositoryConfigured, loadFiles, notify]);

  const repositoryDisabledDescription = useMemo(() => {
    if (configLoading) {
      return 'Checking ADM repository configuration...';
    }
    if (isRepositoryConfigured) {
      return undefined;
    }
    return 'Set mock.embedded.adm-repository.directory to enable repository actions.';
  }, [configLoading, isRepositoryConfigured]);

  const repositoryActionsDisabled = !isRepositoryConfigured || configLoading;

  const dropdownItems = [
    <DropdownItem
      key="import-adm"
      icon={<ImportIcon />}
      isDisabled={repositoryActionsDisabled}
      description={
        repositoryActionsDisabled ? repositoryDisabledDescription : undefined
      }
      onClick={() => {
        if (repositoryActionsDisabled) {
          return;
        }
        loadFiles();
        setImportModalOpen(true);
      }}
    >
      Import a catalog (.adm) from repository
    </DropdownItem>,
    <DropdownItem
      key="import-jar"
      icon={<ImportIcon />}
      onClick={() => {
        openJarPicker();
      }}
    >
      Import a Java archive (.jar)
    </DropdownItem>,
    <DropdownSeparator key="separator" />,
    <DropdownItem
      key="export-adm"
      icon={<ExportIcon />}
      isDisabled={repositoryActionsDisabled}
      description={
        repositoryActionsDisabled ? repositoryDisabledDescription : undefined
      }
      onClick={() => {
        if (repositoryActionsDisabled) {
          return;
        }
        setExportModalOpen(true);
      }}
    >
      Export mappings to repository
    </DropdownItem>,
    <DropdownSeparator key="separator-2" />,
    <DropdownItem
      key="reset"
      icon={<TrashIcon />}
      onClick={() => setResetModalOpen(true)}
    >
      Reset all mappings and clear documents
    </DropdownItem>,
  ];

  const repositoryAlert =
    isRepositoryConfigured && config?.directory ? (
      <Alert
        isInline
        variant={AlertVariant.info}
        title={`Repository directory: ${config.directory}`}
      />
    ) : null;

  return (
    <>
      <ToolbarGroup
        variant="button-group"
        spacer={{ default: 'spacerMd' }}
        style={{ order: 99, marginLeft: 'auto' }}
      >
        <Dropdown
          toggle={
            <DropdownToggle
              id="repository-atlasmap-toggle"
              onToggle={setDropdownOpen}
              data-testid="repository-atlasmap-toggle"
            >
              Save/Load Mappings
            </DropdownToggle>
          }
          isOpen={dropdownOpen}
          dropdownItems={dropdownItems}
          onSelect={() => setDropdownOpen(false)}
          isPlain
        />
      </ToolbarGroup>
      <HiddenFileInput accept=".jar" multiple={false} />
      <Modal
        title="Import a catalog from the repository"
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            isDisabled={!selectedFile || isImporting}
            isLoading={isImporting}
            onClick={handleImport}
          >
            Import selected catalog
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => setImportModalOpen(false)}
            isDisabled={isImporting}
          >
            Cancel
          </Button>,
        ]}
      >
        {repositoryAlert}
        {filesLoading ? (
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        ) : files.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon icon={FolderOpenIcon} />
            <Title headingLevel="h4" size="lg">
              No ADM catalogs found
            </Title>
            <EmptyStateBody>
              Add .adm files to the configured repository directory to import
              them here.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <List isPlain>
            {files.map((entry) => (
              <ListItem key={entry.name}>
                <Radio
                  id={`adm-${entry.name}`}
                  name="adm-selection"
                  label={`${entry.name} — ${formatSize(entry.size)}`}
                  description={`Last modified ${new Date(
                    entry.lastModified,
                  ).toLocaleString()}`}
                  isChecked={selectedFile === entry.name}
                  onChange={() => setSelectedFile(entry.name)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Modal>
      <Modal
        title="Export current mappings to the repository"
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        actions={[
          <Button
            key="save"
            variant="primary"
            onClick={handleExport}
            isDisabled={!exportName.trim().length || isExporting}
            isLoading={isExporting}
          >
            Save catalog
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => setExportModalOpen(false)}
            isDisabled={isExporting}
          >
            Cancel
          </Button>,
        ]}
      >
        {repositoryAlert}
        <Form>
          <FormGroup
            label="Catalog name"
            fieldId="repository-export-name"
            isRequired
            helperText={
              <HelperText>
                <HelperTextItem>
                  The file will be written to the repository directory with the
                  .adm extension.
                </HelperTextItem>
              </HelperText>
            }
          >
            <TextInput
              id="repository-export-name"
              value={exportName}
              onChange={setExportName}
              isRequired
            />
          </FormGroup>
        </Form>
      </Modal>
      <Modal
        title="Reset mappings?"
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        actions={[
          <Button
            key="reset"
            variant="danger"
            onClick={() => {
              resetAtlasmap();
              setResetModalOpen(false);
            }}
          >
            Reset
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => setResetModalOpen(false)}
          >
            Cancel
          </Button>,
        ]}
      >
        Resetting removes all mappings and imported documents. This action
        cannot be undone.
      </Modal>
    </>
  );
};
