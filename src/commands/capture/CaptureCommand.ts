import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { CaptureModal } from '../../capture/CaptureModal';

/**
 * Command: capture-idea
 * Opens the capture modal for creating new ideas
 */
export class CaptureCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    // Note: This method is async to satisfy the base class interface (BaseCommand.execute),
    // even though it doesn't contain any await expressions
    async execute(): Promise<void> {
        try {
            new CaptureModal(
                this.context.app,
                this.context.fileManager,
                this.context.classificationService,
                this.context.duplicateDetector,
                this.context.settings,
                this.context.domainService,
                this.context.webSearchService,
                this.context.nameVariantService,
                this.context.llmService
            ).open();
        } catch (error) {
            this.handleError(error, 'open capture modal', 'capture-idea');
        }
    }
}

