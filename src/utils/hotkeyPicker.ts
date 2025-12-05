/**
 * Utility functions for creating auto-capturing hotkey pickers
 */

/**
 * Convert a keyboard event to a shortcut string (e.g., "cmd+i", "ctrl+shift+k")
 */
export function eventToShortcut(e: KeyboardEvent): string {
    const parts: string[] = [];
    
    // Add modifiers in consistent order
    if (e.metaKey) parts.push('cmd');
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    
    // Add the key
    const key = e.key.toLowerCase();
    if (key === ' ') {
        parts.push('space');
    } else if (key === 'enter') {
        parts.push('enter');
    } else if (key === 'escape') {
        parts.push('escape');
    } else if (key === 'tab') {
        parts.push('tab');
    } else if (key === 'backspace') {
        parts.push('backspace');
    } else if (key === 'delete') {
        parts.push('delete');
    } else if (key === 'arrowup') {
        parts.push('arrowup');
    } else if (key === 'arrowdown') {
        parts.push('arrowdown');
    } else if (key === 'arrowleft') {
        parts.push('arrowleft');
    } else if (key === 'arrowright') {
        parts.push('arrowright');
    } else if (key.length === 1) {
        // Regular character key
        parts.push(key);
    } else {
        // Other special keys (Function keys, etc.)
        parts.push(key);
    }
    
    return parts.join('+');
}

/**
 * Format a shortcut string for display (e.g., "cmd+i" -> "⌘ I")
 */
export function formatShortcut(shortcut: string): string {
    if (!shortcut) return '';
    
    return shortcut
        .split('+')
        .map(part => {
            const trimmed = part.trim().toLowerCase();
            if (trimmed === 'cmd' || trimmed === 'meta') return '⌘';
            if (trimmed === 'ctrl') return '⌃';
            if (trimmed === 'alt') return '⌥';
            if (trimmed === 'shift') return '⇧';
            // Capitalize first letter for keys
            if (trimmed === 'space') return 'Space';
            if (trimmed === 'enter') return 'Enter';
            if (trimmed === 'escape') return 'Esc';
            if (trimmed === 'tab') return 'Tab';
            if (trimmed === 'backspace') return 'Backspace';
            if (trimmed === 'delete') return 'Delete';
            if (trimmed === 'arrowup') return '↑';
            if (trimmed === 'arrowdown') return '↓';
            if (trimmed === 'arrowleft') return '←';
            if (trimmed === 'arrowright') return '→';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        })
        .join(' ');
}

/**
 * Create an auto-capturing hotkey input field
 * When the user focuses the input and presses keys, it automatically captures the key combination
 */
export function createHotkeyPicker(
    inputEl: HTMLInputElement,
    currentValue: string,
    onCapture: (shortcut: string) => void
): void {
    let isCapturing = false;
    let capturedShortcut = currentValue || '';
    
    // Set initial value (formatted for display)
    if (currentValue) {
        inputEl.value = formatShortcut(currentValue);
        capturedShortcut = currentValue;
    } else {
        inputEl.value = '';
    }
    inputEl.placeholder = 'Click and press keys...';
    
    // Style the input to indicate it's a hotkey picker
    inputEl.setCssProps({
        'cursor': 'text',
        'font-family': 'monospace'
    });
    
    // Handle focus - start capturing
    inputEl.addEventListener('focus', () => {
        isCapturing = true;
        inputEl.value = '';
        inputEl.placeholder = 'Press keys...';
        inputEl.setCssProps({
            'background-color': 'var(--background-modifier-active-hover)'
        });
    });
    
    // Handle blur - stop capturing and save
    inputEl.addEventListener('blur', () => {
        isCapturing = false;
        inputEl.setCssProps({
            'background-color': ''
        });
        if (capturedShortcut) {
            inputEl.value = formatShortcut(capturedShortcut);
        } else {
            inputEl.value = currentValue ? formatShortcut(currentValue) : '';
            inputEl.placeholder = 'Click and press keys...';
        }
    });
    
    // Handle keydown - capture the key combination
    inputEl.addEventListener('keydown', (e) => {
        if (!isCapturing) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Don't capture if only modifiers are pressed (wait for actual key)
        if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }
        
        // Convert event to shortcut string
        const shortcut = eventToShortcut(e);
        
        // Update display
        capturedShortcut = shortcut;
        inputEl.value = formatShortcut(shortcut);
        
        // Call the callback
        onCapture(shortcut);
    });
    
    // Handle keyup - update display
    inputEl.addEventListener('keyup', (e) => {
        if (!isCapturing) return;
        
        // If all keys are released, show the captured shortcut
        if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && capturedShortcut) {
            inputEl.value = formatShortcut(capturedShortcut);
        }
    });
}

