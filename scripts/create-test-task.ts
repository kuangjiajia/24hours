import { LinearClient } from '@linear/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTestTask() {
  const client = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY!,
  });

  const teamId = process.env.LINEAR_TEAM_ID!;
  const timestamp = Date.now();

  console.log('Creating test task...');

  try {
    // Get team to find Todo state
    const team = await client.team(teamId);
    const states = await team.states();
    const todoState = states.nodes.find((s) => s.name === 'Todo');

    if (!todoState) {
      console.error('Todo state not found');
      process.exit(1);
    }

    // Create test issue
    const issue = await client.createIssue({
      teamId,
      title: `[测试] 请回复"测试成功" - ${timestamp}`,
      description:
        '这是一个自动化测试任务，请直接回复"测试成功"即可。\n\n此任务用于验证系统是否正常运行。',
      stateId: todoState.id,
    });

    const createdIssue = await issue.issue;

    console.log(`✓ 测试任务创建成功`);
    console.log(`  - ID: ${createdIssue?.id}`);
    console.log(`  - Identifier: ${createdIssue?.identifier}`);
    console.log(`  - Title: ${createdIssue?.title}`);
    console.log('');
    console.log('等待系统自动拉取并执行任务...');
    console.log('请在 Linear 中查看任务状态和评论');
    console.log(`https://linear.app/kaitox/issue/${createdIssue?.identifier}`);
    console.log('');
    console.log('SUCCESS');
  } catch (error) {
    console.error('Failed to create test task:', error);
    process.exit(1);
  }
}

createTestTask();
