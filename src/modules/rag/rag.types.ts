export interface AskQuestionInput {
    tenantId: string;
    question: string;
}

export interface SourceReference {
    documentId: string;
    filename: string;
    chunkIndex: number;
    similarity: number;
}

export interface AskQuestionResult {
    answer: string;
    sources: SourceReference[];
}