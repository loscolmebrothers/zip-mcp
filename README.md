# ZIP MCP Server

An MCP (Model Context Protocol) server that provides ZIP file compression and decompression capabilities for AI assistants like Claude.

## Features

- **Compress files and directories** into ZIP archives
- **Decompress ZIP files** to specified directories
- **Get ZIP metadata** including file listings and compression info
- Support for multiple input files/directories
- Configurable compression options
- Password protection support (via adm-zip)

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

Add to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zip": {
      "command": "node",
      "args": ["/absolute/path/to/zip-mcp/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/zip-mcp` with the actual path to this project.

### Available Tools

#### `compress`

Compress local files or directories into a ZIP file.

**Parameters:**
- `input` (string | string[]): File path(s) or directory to compress
- `output` (string): Output ZIP file path
- `options` (optional):
  - `overwrite` (boolean): Overwrite if output file exists
  - `level` (number): Compression level (0-9)
  - `password` (string): Password to encrypt ZIP file
  - `comment` (string): ZIP file comment
  - `encryptionStrength` (number): Encryption strength (1=AES-128, 2=AES-192, 3=AES-256)

**Example:**
```json
{
  "input": ["./docs", "./src/index.ts"],
  "output": "./archive.zip",
  "options": {
    "overwrite": true,
    "comment": "Project backup"
  }
}
```

#### `decompress`

Decompress a local ZIP file to a specified directory.

**Parameters:**
- `input` (string): ZIP file path to decompress
- `output` (string): Output directory path
- `options` (optional):
  - `overwrite` (boolean): Overwrite existing files
  - `password` (string): Password for encrypted ZIP
  - `createDirectories` (boolean): Create output directory if it doesn't exist

**Example:**
```json
{
  "input": "./archive.zip",
  "output": "./extracted",
  "options": {
    "overwrite": true,
    "createDirectories": true
  }
}
```

#### `getZipInfo`

Get metadata information about a ZIP file.

**Parameters:**
- `input` (string): ZIP file path
- `options` (optional):
  - `password` (string): Password for encrypted ZIP

**Returns:** JSON with file size, entry count, file listings, and compression details.

#### `echo`

Simple echo tool for testing the MCP connection.

**Parameters:**
- `message` (string): Message to echo back

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# The build output will be in ./build/index.js
```

## Dependencies

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK for building servers
- [adm-zip](https://github.com/cthackers/adm-zip) - ZIP file manipulation library

## License

ISC

## Author

danicolms
