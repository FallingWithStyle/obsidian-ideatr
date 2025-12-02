/**
 * Quick test script to verify command callbacks work
 * Run with: node test-command-execution.js
 */

// Mock Obsidian Plugin
class MockPlugin {
    constructor() {
        this.commands = [];
    }
    
    addCommand(command) {
        this.commands.push(command);
        console.log(`✓ Registered command: ${command.name} (${command.id})`);
    }
}

// Test the callback creation
const createCommandCallback = (commandName, operation) => {
    return async () => {
        console.log(`[TEST] Callback invoked for: ${commandName}`);
        try {
            await operation();
            console.log(`[TEST] Operation completed for: ${commandName}`);
        } catch (error) {
            console.error(`[TEST] Error in ${commandName}:`, error);
        }
    };
};

// Test
const plugin = new MockPlugin();

// Register a test command
const testCallback = createCommandCallback('Test Command', async () => {
    console.log('[TEST] Executing test operation...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[TEST] Test operation complete');
});

plugin.addCommand({
    id: 'test-command',
    name: 'Test Command',
    callback: testCallback
});

// Try to invoke it
console.log('\n--- Testing callback invocation ---');
const registeredCommand = plugin.commands.find(c => c.id === 'test-command');
if (registeredCommand) {
    console.log('Found registered command, invoking callback...');
    registeredCommand.callback().then(() => {
        console.log('\n✓ Test completed successfully!');
        console.log('If you see "Callback invoked" above, the callback mechanism works.');
    }).catch(err => {
        console.error('\n✗ Test failed:', err);
    });
} else {
    console.error('✗ Could not find registered command');
}

