FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y \
    postgresql-client \
    iputils-ping \
    dnsutils \
    net-tools \
    procps \
    lsof \
    tree \
    nano \
    htop \
    curl \
    wget \
    unzip \
    zip \
    git \
    bash-completion \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENV NODE_ENV=development