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

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.atlasmap.mockembedded.adm.AdmRepositoryService.AdmRepositoryFile;

/**
 * REST API that exposes the configured ADM repository to the embedded UI.
 */
@RestController
@RequestMapping("/mock/adm")
public class AdmRepositoryController {

    private final AdmRepositoryService repositoryService;

    public AdmRepositoryController(AdmRepositoryService repositoryService) {
        this.repositoryService = repositoryService;
    }

    @GetMapping("/config")
    public AdmRepositoryConfig getConfiguration() {
        return new AdmRepositoryConfig(
            repositoryService.isConfigured(),
            repositoryService.getRepositoryDirectory().map(Path::toString).orElse(null));
    }

    @GetMapping("/files")
    public List<AdmRepositoryFile> listFiles() {
        ensureConfigured();
        try {
            return repositoryService.listFiles();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage(), e);
        }
    }

    @GetMapping(value = "/files/{fileName:.+}", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        ensureConfigured();
        try {
            Resource resource = repositoryService.loadFile(fileName);
            String downloadName = resource.getFilename() != null ? resource.getFilename() : fileName;
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloadName + "\"")
                .body(resource);
        } catch (NoSuchFileException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage(), e);
        }
    }

    @PostMapping(value = "/files/{fileName:.+}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Void> saveFile(@PathVariable String fileName, @RequestBody byte[] content) {
        ensureConfigured();
        try {
            repositoryService.saveFile(fileName, content);
            return ResponseEntity.accepted().build();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage(), e);
        }
    }

    private void ensureConfigured() {
        if (!repositoryService.isConfigured()) {
            throw new ResponseStatusException(
                HttpStatus.PRECONDITION_REQUIRED,
                "ADM repository directory is not configured");
        }
    }

    /** DTO describing current ADM repository configuration. */
    public static class AdmRepositoryConfig {
        private final boolean configured;
        private final String directory;

        public AdmRepositoryConfig(boolean configured, String directory) {
            this.configured = configured;
            this.directory = directory;
        }

        public boolean isConfigured() {
            return configured;
        }

        public String getDirectory() {
            return directory;
        }
    }
}
