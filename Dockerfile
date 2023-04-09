FROM node:18-alpine as prod
WORKDIR /behringer-remote
COPY *.* /behringer-remote/
COPY src /behringer-remote/src
COPY public /behringer-remote/public
COPY scripts /behringer-remote/scripts
RUN yarn
ENTRYPOINT [ "yarn", "start" ]

# Development image - Things get mounted rather than copied
FROM node:18-alpine as dev
WORKDIR /behringer-remote
COPY *.* /behringer-remote/
RUN yarn
ENTRYPOINT [ "yarn", "dev" ]