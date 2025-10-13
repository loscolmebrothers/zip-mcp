import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";

const server = new Server(
  {
    name: "zip-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "compress",
        description: "Compress local files or directories into a ZIP file",
        inputSchema: {
          type: "object",
          properties: {
            input: {
              anyOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
              ],
              description: "File path(s) or directory to compress",
            },
            output: {
              type: "string",
              description: "Output ZIP file path",
            },
            options: {
              type: "object",
              properties: {
                overwrite: {
                  type: "boolean",
                  description: "Overwrite if output file exists",
                },
                level: {
                  type: "number",
                  description: "Compression level (0-9)",
                  minimum: 0,
                  maximum: 9,
                },
                password: {
                  type: "string",
                  description: "Password to encrypt ZIP file",
                },
                comment: {
                  type: "string",
                  description: "ZIP file comment",
                },
                encryptionStrength: {
                  type: "number",
                  enum: [1, 2, 3],
                  description:
                    "Encryption strength (1=AES-128, 2=AES-192, 3=AES-256)",
                },
              },
            },
          },
          required: ["input", "output"],
        },
      },
      {
        name: "decompress",
        description: "Decompress local ZIP file to specified directory",
        inputSchema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "ZIP file path to decompress",
            },
            output: {
              type: "string",
              description: "Output directory path",
            },
            options: {
              type: "object",
              properties: {
                overwrite: {
                  type: "boolean",
                  description: "Overwrite existing files",
                },
                password: {
                  type: "string",
                  description: "Password for encrypted ZIP",
                },
                createDirectories: {
                  type: "boolean",
                  description: "Create output directory if it doesn't exist",
                },
              },
            },
          },
          required: ["input", "output"],
        },
      },
      {
        name: "getZipInfo",
        description: "Get metadata information of a local ZIP file",
        inputSchema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "ZIP file path",
            },
            options: {
              type: "object",
              properties: {
                password: {
                  type: "string",
                  description: "Password for encrypted ZIP",
                },
              },
            },
          },
          required: ["input"],
        },
      },
      {
        name: "echo",
        description: "Return the input message (for testing)",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("Missing arguments");
  }

  try {
    switch (name) {
      case "echo": {
        return {
          content: [
            {
              type: "text",
              text: `Echo: ${args.message}`,
            },
          ],
        };
      }

      case "compress": {
        const input = args.input as string | string[];
        const output = args.output as string;
        const options = (args.options as any) || {};

        if (fs.existsSync(output) && !options.overwrite) {
          throw new Error(`Output file already exists: ${output}`);
        }

        const zip = new AdmZip();

        const inputs = Array.isArray(input) ? input : [input];

        for (const inputPath of inputs) {
          if (!fs.existsSync(inputPath)) {
            throw new Error(`Input path does not exist: ${inputPath}`);
          }

          const stats = fs.statSync(inputPath);

          if (stats.isDirectory()) {
            zip.addLocalFolder(inputPath, path.basename(inputPath));
          } else {
            zip.addLocalFile(inputPath);
          }
        }

        if (options.comment) {
          zip.addZipComment(options.comment);
        }

        zip.writeZip(output);

        const outputStats = fs.statSync(output);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  output: output,
                  size: outputStats.size,
                  files: zip.getEntries().length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "decompress": {
        const input = args.input as string;
        const output = args.output as string;
        const options = (args.options as any) || {};

        if (!fs.existsSync(input)) {
          throw new Error(`ZIP file does not exist: ${input}`);
        }

        if (options.createDirectories && !fs.existsSync(output)) {
          fs.mkdirSync(output, { recursive: true });
        }

        if (!fs.existsSync(output)) {
          throw new Error(`Output directory does not exist: ${output}`);
        }

        const zip = new AdmZip(input);

        zip.extractAllTo(output, options.overwrite || false);

        const entries = zip.getEntries();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  output: output,
                  filesExtracted: entries.length,
                  files: entries.map((e) => e.entryName),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "getZipInfo": {
        const input = args.input as string;

        if (!fs.existsSync(input)) {
          throw new Error(`ZIP file does not exist: ${input}`);
        }

        const zip = new AdmZip(input);
        const entries = zip.getEntries();
        const stats = fs.statSync(input);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  path: input,
                  size: stats.size,
                  totalEntries: entries.length,
                  comment: zip.getZipComment() || "",
                  entries: entries.map((e) => ({
                    name: e.entryName,
                    size: e.header.size,
                    compressedSize: e.header.compressedSize,
                    isDirectory: e.isDirectory,
                    date: e.header.time,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ZIP MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
