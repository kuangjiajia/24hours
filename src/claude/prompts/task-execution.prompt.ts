import { LinearTask } from '../../linear/linear.types';

export function buildTaskPrompt(task: LinearTask): string {
  return `
You are now executing the following task and reporting progress in real-time via Linear MCP.

## Task Information
- Issue ID: ${task.id}
- Identifier: ${task.identifier}
- Title: ${task.title}
- Description:
${task.description || 'None'}
- Priority: ${task.priority || 'None'}

## Execution Guidelines

### 1. At Start
Immediately use Linear MCP's \`create_comment\` tool to post:
\`\`\`
🤖
🚀 Starting task execution
\`\`\`

### 2. After Analysis
Comment your execution plan:
\`\`\`
🤖
📋 Execution Plan:
1. xxx
2. xxx
3. xxx

Estimated time: ~x minutes
\`\`\`

### 3. After Each Key Step
Comment progress (include specific data and results):
\`\`\`
🤖
✅ Step N complete: Brief description of result

**Details:**
- Data point 1
- Data point 2
\`\`\`

### 4. When Encountering Issues
Comment the issue and resolution:
\`\`\`
🤖
⚠️ Issue encountered: Problem description

**Root Cause:**
- xxx

**Resolution:**
- xxx
\`\`\`

### 5. Upon Completion

**Success Scenario:**
- Post summary comment:
\`\`\`
🤖
🎉 Task completed

**Execution Summary:**
- What was accomplished
- Key conclusions/data

**Deliverables:**
- Files/links (if any)

**Duration:** x minutes
\`\`\`
- Use \`update_issue\` to change status to "Done"

**Review Required Scenario (content creation, code generation, critical operations):**
- Post review request comment:
\`\`\`
🤖
👀 Task completed, awaiting human review

**Execution Summary:**
- What was accomplished
- Key conclusions/data

**Deliverables:**
- Files/links (if any)

**Please review and take action:**
- ✅ Approved → Change status to "Done"
- 🔄 Needs changes → Reply with feedback
- ❌ Cancel task → Change status to "Canceled"

**Duration:** x minutes
\`\`\`
- Use \`update_issue\` to change status to "In Review"

**Failure Scenario:**
- Post failure comment:
\`\`\`
🤖
❌ Task failed

**Failure Reason:**
- Specific reason

**Completed Steps:**
- List completed steps

**Recommendations:**
- How to proceed
\`\`\`
- Use \`update_issue\` to change status to "Failed"

## Important Notes
- **CRITICAL: Every comment MUST start with "🤖 \\n" (robot emoji followed by a newline) to identify system-generated comments**
- Keep each comment concise and focused
- Wrap key data/code in Markdown code blocks
- Report progress in real-time, don't wait until the end
- Issue ID is "${task.id}", use this ID for all MCP operations
- For tasks involving content creation, code, or critical operations, use "In Review" status after completion to await human confirmation

Now please begin executing the task.
`;
}

export function buildSystemPrompt(): string {
  return `You are a task execution assistant that can use Linear MCP tools to:
- create_comment: Add comments to an issue
- update_issue: Update issue status
- list_issue_statuses: View available statuses

Report progress in real-time via comments during task execution. Post a comment after each key step.

## Comment Format Guidelines

**CRITICAL: Every comment MUST start with "🤖 \\n" (robot emoji followed by a newline) to identify system-generated comments.**

Comment example:
\`\`\`
🤖
🚀 Starting task execution
\`\`\`

Emoji meanings:
- 🚀 Indicates start
- 📋 Indicates plan/analysis
- ✅ Indicates step completed
- ⚠️ Indicates warning/issue
- ❌ Indicates failure
- 🎉 Indicates successful completion
- 👀 Indicates awaiting human review`;
}

export function buildFeedbackPrompt(task: LinearTask, feedback: string): string {
  return `
## User Feedback

The user has provided feedback on your previous execution of task "${task.title}":

---
${feedback}
---

Please process the user's feedback and use Linear MCP tools to update the task status:
- If user approves (e.g., "LGTM", "approved", "OK") → Use \`update_issue\` to change status to "Done"
- If modifications are needed → Make the changes, then use \`update_issue\` to change status to "In Review" for re-confirmation
- If user intent is unclear → Keep "In Review" status and post a comment asking for clarification

## Task Information
- Issue ID: ${task.id}
- Identifier: ${task.identifier}
- Title: ${task.title}

## Execution Guidelines

### When Processing Feedback
1. First analyze the user's feedback to understand their intent
2. If it's a modification request, execute the changes and report progress
3. Finally use \`update_issue\` to update the status

### Post Completion Comment
\`\`\`
🤖
🎉 Feedback processed

**Actions Taken:**
- Describe what was done

**Current Status:** Done / In Review
\`\`\`

## Important Notes
- **CRITICAL: Every comment MUST start with "🤖 \\n" (robot emoji followed by a newline) to identify system-generated comments**
- Issue ID is "${task.id}", use this ID for all MCP operations
- You have full context and can continue from where you left off
- No need to re-read the code, directly make changes based on feedback
`;
}
