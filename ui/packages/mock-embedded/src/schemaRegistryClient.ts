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

/*
 * Helper functions to talk to the Schema Registry.
 */
export interface ArtifactSummary {
  groupId: string;
  artifactId: string;
  name?: string;
  contentType?: string;
}

const defaultBaseUrl = '';

export async function fetchArtifacts(
  baseUrl: string = defaultBaseUrl,
): Promise<ArtifactSummary[]> {
  const res = await fetch(
    `${baseUrl}/apis/registry/v3/search/artifacts?orderby=groupId`,
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return (data.artifacts || data.items || []) as ArtifactSummary[];
}

export async function fetchVersions(
  baseUrl: string,
  groupId: string,
  artifactId: string,
): Promise<string[]> {
  const res = await fetch(
    `${baseUrl}/apis/registry/v3/groups/${encodeURIComponent(
      groupId || 'default',
    )}/artifacts/${encodeURIComponent(artifactId)}/versions`,
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  const versions = data.versions || data.items || data || [];
  return Array.isArray(versions)
    ? versions.map((v: any) => `${v.version || v}`)
    : [];
}

function inferSchemaInfo(
  artifact: ArtifactSummary,
  blob: Blob,
  versionLabel: string,
) {
  const mime = blob.type || artifact.contentType || '';
  const nameHint = artifact.name || artifact.artifactId;
  const lower = nameHint ? nameHint.toLowerCase() : '';
  const looksXml =
    mime.includes('xml') || lower.endsWith('.xsd') || lower.includes('xml');
  const looksJson =
    mime.includes('json') || lower.endsWith('.json') || lower.includes('json');
  const ext = looksXml ? 'xsd' : looksJson ? 'json' : 'json';
  const fileType = looksXml ? 'application/xml' : 'application/schema+json';
  const filename = `${nameHint}${
    versionLabel ? `-${versionLabel}` : ''
  }.${ext}`;
  return { filename, fileType };
}

export async function fetchArtifactContent(
  baseUrl: string,
  artifact: ArtifactSummary,
  version?: string,
): Promise<File> {
  const groupId = artifact.groupId || 'default';
  const artifactId = artifact.artifactId;
  const versionPath =
    version && version !== 'latest'
      ? `/versions/${encodeURIComponent(version)}`
      : '/versions/latest';
  const res = await fetch(
    `${baseUrl}/apis/registry/v3/groups/${encodeURIComponent(
      groupId,
    )}/artifacts/${encodeURIComponent(artifactId)}${versionPath}/content`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const blob = await res.blob();
  const { filename, fileType } = inferSchemaInfo(
    artifact,
    blob,
    version && version !== 'latest' ? version : '',
  );
  return new File([blob], filename, { type: fileType });
}
