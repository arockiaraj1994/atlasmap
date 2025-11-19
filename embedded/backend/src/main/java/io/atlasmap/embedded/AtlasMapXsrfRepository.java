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
package io.atlasmap.embedded;

import java.util.Optional;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.DefaultCsrfToken;

/**
 * CSRF repository sending the header AtlasMap UI expects.
 */
public class AtlasMapXsrfRepository implements CsrfTokenRepository {

    private static final String XSRF_HEADER_NAME = "ATLASMAP-XSRF-TOKEN";
    private static final String XSRF_HEADER_VALUE = "awesome";

    private static final Logger LOG = LoggerFactory.getLogger(AtlasMapXsrfRepository.class);

    @Override
    public CsrfToken generateToken(HttpServletRequest httpServletRequest) {
        return new DefaultCsrfToken(XSRF_HEADER_NAME, XSRF_HEADER_NAME, XSRF_HEADER_VALUE);
    }

    @Override
    public void saveToken(CsrfToken csrfToken, HttpServletRequest request, HttpServletResponse response) {
        if (csrfToken != null && csrfToken.getHeaderName() != null && csrfToken.getToken() != null) {
            response.setHeader(csrfToken.getHeaderName(), csrfToken.getToken());
        }
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        Optional<String> token = extractToken(request);
        if (token.isPresent()) {
            LOG.trace("Xsrf token found in request to uri {}. Value is: {}", request.getRequestURI(), token.get());
        } else {
            LOG.trace("Xsrf token not found in request to uri {}", request.getRequestURI());
        }
        return token.map(val -> new DefaultCsrfToken(XSRF_HEADER_NAME, XSRF_HEADER_NAME, val)).orElse(null);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        String token = request.getHeader(XSRF_HEADER_NAME);
        return Optional.ofNullable(token);
    }
}

