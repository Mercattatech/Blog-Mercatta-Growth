import { authenticateMcpRequest, MCP_TOOLS, handleMcpToolCall } from '@/lib/mcp.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get('authorization') || url.searchParams.get('key') || url.searchParams.get('apiKey');

    const body = await req.json().catch(() => ({}));
    const key = authHeader || body.key || body.apiKey;

    const tenant = await authenticateMcpRequest(key);
    if (!tenant) {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id || null,
        error: { code: -32001, message: 'Não autorizado. Forneça uma MCP API Key válida via Bearer token ou parâmetro ?key=.' },
      }, { status: 401 });
    }

    const { method, params, id } = body;

    // 1. Handshake do MCP
    if (method === 'initialize') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: {
            name: `mercatta-blog-mcp-${tenant.slug}`,
            version: '2.0.0',
            description: `MCP Server oficial do Blog ${tenant.name} — Gestão de Artigos, Capas, SEO e Analytics`,
          },
        },
      });
    }

    // 2. Lista de ferramentas disponíveis
    if (method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    // 3. Execução de uma ferramenta
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const out = await handleMcpToolCall(toolName, toolArgs, tenant);
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(out, null, 2),
              },
            ],
          },
        });
      } catch (toolErr) {
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [{ type: 'text', text: `Erro ao executar ${toolName}: ${toolErr.message}` }],
          },
        });
      }
    }

    // 4. Recursos & Prompts
    if (method === 'resources/list') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: `blog://${tenant.slug}/profile`,
              name: `Perfil da Empresa: ${tenant.name}`,
              mimeType: 'application/json',
            },
          ],
        },
      });
    }

    // Método desconhecido
    return Response.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Método MCP não suportado: ${method}` },
    });
  } catch (err) {
    return Response.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: `Erro interno do servidor MCP: ${err.message}` },
    }, { status: 500 });
  }
}

// GET simples para checagem de saúde e instruções
export async function GET(req) {
  const url = new URL(req.url);
  const key = req.headers.get('authorization') || url.searchParams.get('key');
  const tenant = await authenticateMcpRequest(key);

  return Response.json({
    status: 'online',
    protocol: 'Model Context Protocol (MCP) JSON-RPC 2.0',
    authenticated: Boolean(tenant),
    tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
    available_tools_count: MCP_TOOLS.length,
    tools: MCP_TOOLS.map((t) => t.name),
    usage: 'Envie requisições JSON-RPC via POST com o header Authorization: Bearer <mcp_api_key>',
  });
}
