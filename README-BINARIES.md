# Bundling llama.cpp Binary

The llama.cpp server binary is bundled with the plugin to avoid requiring users to install it separately.

## Setup (One-time)

1. Copy your llama-server binary to the project:
   ```bash
   mkdir -p binaries/darwin-arm64
   cp /path/to/your/llama-server binaries/darwin-arm64/llama-server
   chmod +x binaries/darwin-arm64/llama-server
   ```

2. For other platforms, create similar directories:
   - `binaries/darwin-x64/` for macOS Intel
   - `binaries/linux-x64/` for Linux
   - `binaries/win32-x64/` for Windows (binary name: `llama-server.exe`)

## Directory Structure

```
binaries/
  darwin-arm64/
    llama-server
  darwin-x64/
    llama-server
  linux-x64/
    llama-server
  win32-x64/
    llama-server.exe
```

The binary will be automatically included when you deploy the plugin.

