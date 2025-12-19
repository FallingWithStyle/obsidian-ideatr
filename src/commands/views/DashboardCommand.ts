import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: open-dashboard
 * Open dashboard view
 */
export class DashboardCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            const leaf = this.context.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: 'ideatr-dashboard',
                active: true
            });
        } catch (error) {
            this.handleError(error, 'open dashboard');
        }
    }
}

