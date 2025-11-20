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
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/**
 * Provides file-system access to the configured ADM repository.
 */
@Service
public class AdmRepositoryService {

    private final Path repositoryDirectory;

    public AdmRepositoryService(AdmRepositoryProperties properties) {
        String configuredDirectory = properties.getDirectory();
        if (configuredDirectory != null && !configuredDirectory.trim().isEmpty()) {
            this.repositoryDirectory = Paths.get(configuredDirectory.trim()).toAbsolutePath().normalize();
        } else {
            this.repositoryDirectory = null;
        }
    }

    public boolean isConfigured() {
        return repositoryDirectory != null;
    }

    public Optional<Path> getRepositoryDirectory() {
        return Optional.ofNullable(repositoryDirectory);
    }

    private Path ensureRepositoryDirectory() {
        if (repositoryDirectory == null) {
            throw new IllegalStateException("ADM repository directory is not configured");
        }
        try {
            Files.createDirectories(repositoryDirectory);
            return repositoryDirectory;
        } catch (IOException e) {
            throw new UncheckedIOException(
                "Unable to create ADM repository directory: " + repositoryDirectory,
                e);
        }
    }

    private Path resolveFile(String fileName) throws IOException {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("File name must not be empty");
        }
        Path repository = ensureRepositoryDirectory();
        String sanitized = Paths.get(fileName).getFileName().toString();
        if (!sanitized.endsWith(".adm")) {
            throw new IllegalArgumentException("ADM files must use the .adm extension");
        }
        Path file = repository.resolve(sanitized).normalize();
        if (!file.startsWith(repository)) {
            throw new IllegalArgumentException("Invalid file name: " + fileName);
        }
        return file;
    }

    public List<AdmRepositoryFile> listFiles() {
        Path repository = ensureRepositoryDirectory();
        try (Stream<Path> files = Files.list(repository)) {
            return files
                .filter(Files::isRegularFile)
                .filter(path -> path.getFileName().toString().endsWith(".adm"))
                .sorted(Comparator.comparing(path -> path.getFileName().toString().toLowerCase()))
                .map(this::toFileDescriptor)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to list ADM repository", e);
        }
    }

    private AdmRepositoryFile toFileDescriptor(Path path) {
        try {
            return new AdmRepositoryFile(
                path.getFileName().toString(),
                Files.size(path),
                Files.getLastModifiedTime(path).toInstant());
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to describe ADM file " + path, e);
        }
    }

    public Resource loadFile(String fileName) throws IOException {
        Path file = resolveFile(fileName);
        if (!Files.exists(file) || !Files.isRegularFile(file)) {
            throw new NoSuchFileException(file.toString());
        }
        return new FileSystemResource(file);
    }

    public void saveFile(String fileName, byte[] content) throws IOException {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("ADM file content must not be empty");
        }
        Path file = resolveFile(fileName);
        Files.createDirectories(file.getParent());
        Files.write(file, content);
    }

    public static class AdmRepositoryFile {
        private final String name;
        private final long size;
        private final Instant lastModified;

        public AdmRepositoryFile(String name, long size, Instant lastModified) {
            this.name = name;
            this.size = size;
            this.lastModified = lastModified;
        }

        public String getName() {
            return name;
        }

        public long getSize() {
            return size;
        }

        public Instant getLastModified() {
            return lastModified;
        }
    }
}
