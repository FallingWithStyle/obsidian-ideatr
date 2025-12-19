import type { ScaffoldTemplate } from '../types/transformation';
import type { IdeaCategory } from '../types/classification';

/**
 * Template definitions for scaffold generation
 * Hardcoded for v0, can be made user-customizable in v1+
 */

/**
 * Category to template ID mapping
 */
const categoryToTemplateMap: Record<IdeaCategory, string> = {
    'saas': 'project',
    'tool': 'project',
    'ux': 'project',
    'game': 'game-mechanic',
    'mechanic': 'game-mechanic',
    'story': 'narrative-seed',
    'ip': 'narrative-seed',
    'hardware': 'hardware-concept',
    'brand': 'hardware-concept',
    'personal': 'generic-idea',
    '': 'generic-idea' // Fallback for empty category
};

/**
 * Project template (for saas, tool, ux)
 */
const projectTemplate: ScaffoldTemplate = {
    id: 'project',
    name: 'Project Scaffold',
    categories: ['saas', 'tool', 'ux'],
    sections: [
        {
            title: 'Overview',
            content: '## Overview\n\n**Name**: {{ideaName}}\n\n{{ideaText}}\n\n**Category**: {{category}}\n\n**Created**: {{created}}'
        },
        {
            title: 'Core Features',
            content: '## Core Features\n\n- [ ] Feature 1\n- [ ] Feature 2\n- [ ] Feature 3',
            questions: [
                'What are the core features of this project?',
                'What problems does it solve?',
                'Who is the target audience?'
            ]
        },
        {
            title: 'Technical Considerations',
            content: '## Technical Considerations\n\n- Technology stack\n- Architecture decisions\n- Scalability requirements',
            questions: [
                'What technologies are needed?',
                'What are the technical challenges?',
                'What infrastructure is required?'
            ]
        },
        {
            title: 'Next Steps',
            content: '## Next Steps\n\n- [ ] Research existing solutions\n- [ ] Validate market need\n- [ ] Create prototype\n- [ ] Gather feedback'
        }
    ]
};

/**
 * Game mechanic template
 */
const gameMechanicTemplate: ScaffoldTemplate = {
    id: 'game-mechanic',
    name: 'Game Mechanic Scaffold',
    categories: ['game', 'mechanic'],
    sections: [
        {
            title: 'Overview',
            content: '## Overview\n\n**Name**: {{ideaName}}\n\n{{ideaText}}\n\n**Category**: {{category}}\n\n**Created**: {{created}}'
        },
        {
            title: 'Mechanic Description',
            content: '## Mechanic Description\n\nDescribe how the mechanic works:\n\n- Core gameplay loop\n- Player interactions\n- Progression systems',
            questions: [
                'How does this mechanic work?',
                'What makes it engaging?',
                'How does it fit into the larger game?'
            ]
        },
        {
            title: 'Implementation Considerations',
            content: '## Implementation Considerations\n\n- Technical requirements\n- Balance and tuning\n- Player feedback systems',
            questions: [
                'What technical challenges exist?',
                'How will this be balanced?',
                'What metrics will measure success?'
            ]
        },
        {
            title: 'Next Steps',
            content: '## Next Steps\n\n- [ ] Create prototype\n- [ ] Playtest mechanic\n- [ ] Iterate based on feedback\n- [ ] Document design decisions'
        }
    ]
};

/**
 * Narrative seed template
 */
const narrativeSeedTemplate: ScaffoldTemplate = {
    id: 'narrative-seed',
    name: 'Narrative Seed Scaffold',
    categories: ['story', 'ip'],
    sections: [
        {
            title: 'Overview',
            content: '## Overview\n\n**Name**: {{ideaName}}\n\n{{ideaText}}\n\n**Category**: {{category}}\n\n**Created**: {{created}}'
        },
        {
            title: 'Core Concept',
            content: '## Core Concept\n\n- Main premise\n- Key themes\n- Unique elements',
            questions: [
                'What is the central premise?',
                'What themes does this explore?',
                'What makes this story unique?'
            ]
        },
        {
            title: 'Characters and World',
            content: '## Characters and World\n\n- Main characters\n- Setting details\n- World-building elements',
            questions: [
                'Who are the main characters?',
                'Where does this take place?',
                'What are the key world-building elements?'
            ]
        },
        {
            title: 'Development',
            content: '## Development\n\n- Plot structure\n- Key scenes\n- Resolution',
            questions: [
                'What is the story structure?',
                'What are the key turning points?',
                'How does it resolve?'
            ]
        }
    ]
};

/**
 * Hardware concept template
 */
const hardwareConceptTemplate: ScaffoldTemplate = {
    id: 'hardware-concept',
    name: 'Hardware Concept Scaffold',
    categories: ['hardware', 'brand'],
    sections: [
        {
            title: 'Overview',
            content: '## Overview\n\n**Name**: {{ideaName}}\n\n{{ideaText}}\n\n**Category**: {{category}}\n\n**Created**: {{created}}'
        },
        {
            title: 'Product Description',
            content: '## Product Description\n\n- Physical specifications\n- Key features\n- Design considerations',
            questions: [
                'What does this product do?',
                'What are the key features?',
                'What is the target market?'
            ]
        },
        {
            title: 'Technical Requirements',
            content: '## Technical Requirements\n\n- Components needed\n- Manufacturing considerations\n- Technical challenges',
            questions: [
                'What components are required?',
                'What are the manufacturing challenges?',
                'What technical expertise is needed?'
            ]
        },
        {
            title: 'Next Steps',
            content: '## Next Steps\n\n- [ ] Create detailed specifications\n- [ ] Research manufacturing options\n- [ ] Build prototype\n- [ ] Test and iterate'
        }
    ]
};

/**
 * Generic idea template (fallback)
 */
const genericIdeaTemplate: ScaffoldTemplate = {
    id: 'generic-idea',
    name: 'Idea Scaffold',
    categories: ['personal', ''],
    sections: [
        {
            title: 'Overview',
            content: '## Overview\n\n**Name**: {{ideaName}}\n\n{{ideaText}}\n\n**Category**: {{category}}\n\n**Created**: {{created}}'
        },
        {
            title: 'Key Points',
            content: '## Key Points\n\n- Main concept\n- Important details\n- Related ideas',
            questions: [
                'What is the core idea?',
                'What are the key elements?',
                'What should be explored further?'
            ]
        },
        {
            title: 'Next Steps',
            content: '## Next Steps\n\n- [ ] Research\n- [ ] Develop further\n- [ ] Take action'
        }
    ]
};

/**
 * All available templates
 */
export const templates: ScaffoldTemplate[] = [
    projectTemplate,
    gameMechanicTemplate,
    narrativeSeedTemplate,
    hardwareConceptTemplate,
    genericIdeaTemplate
];

/**
 * Select template based on category
 */
export function selectTemplate(category: IdeaCategory): ScaffoldTemplate {
    const templateId = categoryToTemplateMap[category] ?? 'generic-idea';
    return templates.find(t => t.id === templateId) ?? genericIdeaTemplate;
}

