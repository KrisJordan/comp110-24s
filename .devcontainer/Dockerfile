FROM ubuntu:22.04

# Setup workspace directory
RUN mkdir /workspace
WORKDIR /workspace

# Install dependencies
ENV TZ=America/New_York
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install --yes \
        apt-transport-https \
        ca-certificates \
        curl \
        debian-keyring \
        debian-archive-keyring \
        git \
        gnupg \
        locales \
        software-properties-common \
        sudo \
        tzdata \
        unzip \
        wget \
        zip \
        zsh \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.12
RUN add-apt-repository ppa:deadsnakes/ppa \
    && apt update \
    && apt install --yes \
        python3.12 \
        libpq-dev \
        python3.12-dev \
        python3.12-distutils \
        python3-pip \
        libcairo2 \
    && rm -rf /var/lib/apt/lists* \
    && unlink /usr/bin/python3 \
    && ln -s /usr/bin/python3.12 /usr/bin/python3

# Update PIP for 3.12 / Ubuntu compatibility (https://ubuntuhandbook.org/index.php/2023/10/fix-broken-pip-python-312-ubuntu/)
RUN wget -O /tmp/get-pip.py https://bootstrap.pypa.io/get-pip.py && \
    python3 /tmp/get-pip.py && \
    rm /tmp/get-pip.py

# Use a non-root user per https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Add non-root user and add to sudoers
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /usr/bin/zsh \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set code to default git commit editor
RUN git config --system core.editor "code --wait"
# Set Safe Directory
RUN git config --system safe.directory '/workspace'

# Configure zsh
USER $USERNAME
ENV HOME /home/$USERNAME

# Add zsh theme with niceties
RUN curl https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | bash - \
    && sed -i 's/robbyrussell/kennethreitz/g' ~/.zshrc \
    && echo 'export PATH=$PATH:$HOME/.local/bin' >>~/.zshrc

# Set Locale for Functional Autocompletion in zsh
RUN sudo locale-gen en_US.UTF-8

# Add `oc` OpenShift Client
RUN arch="$(arch)"; \
    case "$arch" in \
        x86_64) export TARGET='' ;; \
        aarch64) export TARGET='arm64-' ;; \
    esac; \
    wget -O /tmp/oc.tgz "https://github.com/okd-project/okd/releases/download/4.14.0-0.okd-2023-12-01-225814/openshift-client-linux-${TARGET}4.14.0-0.okd-2023-12-01-225814.tar.gz" && \
    cd /tmp && \
    tar -xvzf oc.tgz && \
    sudo mv oc /usr/bin/oc && \
    rm kubectl oc.tgz README.md

# Install Python requirements.txt
COPY requirements.txt /workspace/requirements.txt
WORKDIR /workspace
RUN echo 'export PYTHONPATH=/workspace' && \
    python3 -m pip install -r requirements.txt