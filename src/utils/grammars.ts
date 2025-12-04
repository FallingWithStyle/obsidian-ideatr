/**
 * GBNF Grammars for strict JSON output from Llama.cpp
 */

export const GRAMMARS = {
    // Helper patterns
    _string: `string ::= "\\"" ([^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""`,
    _number: `number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?`,
    _boolean: `boolean ::= "true" | "false"`,
    _null: `null ::= "null"`,
    _array: `array ::= "[" (value ("," value)*)? "]"`,
    _ws: `ws ::= [ \\t\\n]*`,

    /**
     * Grammar for Classification result
     * { "category": "string", "tags": ["string", ...] }
     */
    classification: `root ::= object
ws ::= [ \\t\\n]*
string ::= "\\"" ([^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
string_array ::= "[" ws (string (ws "," ws string)*)? ws "]"
object ::= "{" ws "\\"category\\"" ws ":" ws string ws "," ws "\\"tags\\"" ws ":" ws string_array ws "}"`,

    /**
     * Grammar for Mutations result (Array of objects)
     * [ { "title": "...", "description": "...", "differences": [...] }, ... ]
     */
    mutations: `root ::= mutation_array
ws ::= [ \\t\\n]*
string ::= "\\"" ([^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
string_array ::= "[" ws (string (ws "," ws string)*)? ws "]"
mutation ::= "{" ws "\\"title\\"" ws ":" ws string ws "," ws "\\"description\\"" ws ":" ws string ws "," ws "\\"differences\\"" ws ":" ws string_array ws "}"
mutation_array ::= "[" ws (mutation (ws "," ws mutation)*)? ws "]"`,

    /**
     * Grammar for Cluster Analysis
     * { "commonThemes": [...], "commonPatterns": [...], "relationshipExplanation": "...", "synergies": [...], "relevance": 0.0 }
     */
    clusterAnalysis: `root ::= object
ws ::= [ \\t\\n]*
string ::= "\\"" ([^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
string_array ::= "[" ws (string (ws "," ws string)*)? ws "]"
number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?
optional_relationship ::= ("," ws "\\"relationshipToOtherCluster\\"" ws ":" ws string)?
object ::= "{" ws "\\"commonThemes\\"" ws ":" ws string_array ws "," ws "\\"commonPatterns\\"" ws ":" ws string_array ws "," ws "\\"relationshipExplanation\\"" ws ":" ws string ws "," ws "\\"synergies\\"" ws ":" ws string_array ws "," ws "\\"relevance\\"" ws ":" ws number optional_relationship ws "}"
`
};
