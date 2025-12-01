import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: open-graph
 * Open graph view
 */
export class GraphViewCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            const leaf = this.context.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: 'ideatr-graph',
                active: true
            });
        } catch (error) {
            this.handleError(error, 'open graph view');
        }
    }
}

