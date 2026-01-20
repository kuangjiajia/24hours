import { LinearClient } from '@linear/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupTestData() {
  const client = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY!,
  });

  const teamId = process.env.LINEAR_TEAM_ID!;

  console.log('Searching for test tasks...');

  try {
    // Get Canceled state
    const team = await client.team(teamId);
    const states = await team.states();
    const canceledState = states.nodes.find((s) => s.name === 'Canceled');

    if (!canceledState) {
      console.error('Canceled state not found');
      process.exit(1);
    }

    // Find all test issues
    const issues = await client.issues({
      filter: {
        team: { id: { eq: teamId } },
        title: { contains: '[测试]' },
      },
    });

    console.log(`Found ${issues.nodes.length} test tasks`);

    // Mark each as Canceled
    for (const issue of issues.nodes) {
      await client.updateIssue(issue.id, {
        stateId: canceledState.id,
      });
      console.log(`✓ Cleaned: ${issue.identifier} - ${issue.title}`);
    }

    console.log('');
    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    process.exit(1);
  }
}

cleanupTestData();
