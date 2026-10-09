#!/usr/bin/env node
/**
 * Servidor MCP Standalone via STDIO para Claude Desktop, Cursor e IAs externas.
 *
 * Como usar no claude_desktop_config.json ou .cursor/mcp.json:
 * {
 *   "mcpServers": {
 *     "mercatta_blog": {
 *       "command": "node",
 *       "args": ["/caminho/do/projeto/bin/mcp-server.js"],
 *       "env": {
 *         "MCP_API_KEY": "mcp_sua_chave_aqui",
 *         "MCP_SERVER_URL": "http://localhost:3100"
 *       }
 *     }
 *   }
 * }
 */

const readline = require('node:readline');

const API_KEY = process.env.MCP_API_KEY || process.argv.find((a) => a.startsWith('--key='))?.split('=')[1] || '';
const SERVER_URL = process.env.MCP_SERVER_URL || process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:3100';

if (!API_KEY) {
  console.error('[MCP Error] Chave de API não informada. Defina MCP_API_KEY no ambiente ou use --key=mcp_...');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const jsonReq = JSON.parse(trimmed);
    const res = await fetch(`${SERVER_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(jsonReq),
    });

    const jsonRes = await res.json();
    process.stdout.write(JSON.stringify(jsonRes) + '\n');
  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: `Erro na ponte MCP STDIO: ${err.message}` },
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});
