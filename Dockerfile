# syntax=docker/dockerfile:1.3
ARG BUILD_VERSION

FROM node:16-alpine3.14 AS build

WORKDIR /build

COPY ["package*.json", "tsconfig.json", ".eslintrc.json", "./"]

RUN --mount=type=cache,target=/build/node_modules set -ex ; \
    npm install

COPY src src/

RUN --mount=type=cache,target=/build/node_modules set -ex ; \
    npm run build ; \
    cp -a node_modules dist/

FROM node:16-alpine3.14

ENV BUILD_VERSION=${BUILD_VERSION}

WORKDIR /app

COPY --from=build --chown=node:node /build/dist .

USER node

CMD [ "node", "index.js" ]
