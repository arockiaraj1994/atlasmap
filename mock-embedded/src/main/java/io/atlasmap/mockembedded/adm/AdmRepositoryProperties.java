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
package io.atlasmap.mockembedded.adm;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the ADM repository integration used by the mock embedded UI.
 */
@ConfigurationProperties(prefix = "mock.embedded.adm-repository")
public class AdmRepositoryProperties {
    /** Directory that contains the ADM catalogs available to the embedded UI. */
    private String directory;

    public String getDirectory() {
        return directory;
    }

    public void setDirectory(String directory) {
        this.directory = directory;
    }
}
