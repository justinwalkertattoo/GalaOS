FROM jrottenberg/ffmpeg:4.4-alpine

# Install additional tools
RUN apk add --no-cache \
    curl \
    ca-certificates

WORKDIR /workspace

# Keep container running
CMD ["tail", "-f", "/dev/null"]
