import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('Testing Claude API...');
  
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        { role: 'user', content: '你好，请回复"测试成功"' }
      ],
    });

    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

test();
