import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { TutorialService } from '../../services/TutorialService';

/**
 * Command to open the tutorial index
 */
export class OpenTutorialsCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            const tutorialService = new TutorialService(this.context.app);
            await tutorialService.openIndex();
        } catch (error) {
            this.handleError(error, 'open tutorials', 'Opening tutorials');
        }
    }
}

