import { query } from '@anthropic-ai/claude-agent-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

type AuthMethod = 'api_key' | 'login';

/**
 * Build environment variables based on authentication method
 * - 'api_key': Use proxy API (ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN)
 * - 'login': Use standard Anthropic API (ANTHROPIC_API_KEY)
 */
function buildEnvVars(authMethod: AuthMethod): Record<string, string | undefined> {
  const baseEnv = { ...process.env };

  if (authMethod === 'api_key') {
    // For proxy API: use ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN
    const baseUrl = process.env.ANTHROPIC_BASE_URL;
    const authToken = process.env.ANTHROPIC_AUTH_TOKEN;

    if (!baseUrl || !authToken) {
      throw new Error('ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN are required for api_key mode');
    }

    console.log(`Using proxy API: ${baseUrl}`);

    return {
      ...baseEnv,
      ANTHROPIC_BASE_URL: baseUrl,
      ANTHROPIC_API_KEY: authToken, // Proxy uses auth token as API key
    };
  }

  // For login mode: use standard Anthropic API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for login mode');
  }

  console.log('Using standard Anthropic API');

  return {
    ...baseEnv,
    ANTHROPIC_API_KEY: apiKey,
    ANTHROPIC_BASE_URL: undefined,
  };
}

async function testClaudeAgentSDK() {
  const authMethod = (process.env.CLAUDE_AUTH_METHOD || 'api_key') as AuthMethod;

  console.log('Testing Claude Agent SDK...');
  console.log('Authentication method:', authMethod);
  console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL || '(not set)');
  console.log('ANTHROPIC_AUTH_TOKEN exists:', !!process.env.ANTHROPIC_AUTH_TOKEN);

  try {
    const envVars = buildEnvVars(authMethod);

    // Simple test without MCP first
    console.log('\n--- Test 1: Simple query without MCP ---');
    const simpleQuery = query({
      prompt: '请回复"Claude Agent SDK 测试成功"',
      options: {
        model: 'claude-sonnet-4-5-20250929',
        env: envVars,
      },
    });

    for await (const msg of simpleQuery) {
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'text') {
            console.log('Assistant:', block.text);
          }
        }
      } else if (msg.type === 'result') {
        console.log('Result type:', msg.subtype);
        if (msg.subtype === 'success') {
          console.log('Result:', msg.result);
        }
      }
    }
    console.log('Simple query test passed!\n');

    // Test with Linear MCP
    console.log('--- Test 2: Query with Linear MCP ---');
    const mcpQuery = query({
      prompt: '使用 Linear MCP 获取可用的 issue 状态列表',
      options: {
        model: 'claude-sonnet-4-5-20250929',
        env: envVars,
        mcpServers: {
          linear: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
            env: {
              LINEAR_API_KEY: process.env.LINEAR_API_KEY || '',
            },
          },
        },
        allowedTools: [
          'mcp__linear__list_issue_statuses',
        ],
      },
    });

    for await (const msg of mcpQuery) {
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'text') {
            console.log('Assistant:', block.text.slice(0, 200));
          } else if (block.type === 'tool_use') {
            console.log('Tool used:', block.name);
          }
        }
      } else if (msg.type === 'result') {
        console.log('Result type:', msg.subtype);
      }
    }
    console.log('MCP query test completed!\n');

  } catch (error) {
    console.error('Error:', error.message);

    // Provide helpful error messages
    if (error.message.includes('401') || error.message.includes('无效的令牌') || error.message.includes('invalid')) {
      if (authMethod === 'api_key') {
        console.error('\n提示: 代理 API 认证失败。请检查 ANTHROPIC_BASE_URL 和 ANTHROPIC_AUTH_TOKEN 是否正确。');
      } else {
        console.error('\n提示: Anthropic API 认证失败。请检查 ANTHROPIC_API_KEY 是否正确。');
      }
    }

    console.error('Stack:', error.stack);
  }
}

testClaudeAgentSDK();
