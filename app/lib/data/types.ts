export interface ExportData {
  version: string;
  exportDate: string;
  lastChangeDate?: string;
  trackers: Array<{
    id: string;
    title: string;
    type: string;
    isNumber: boolean;
    goal?: number;
    parentId?: string;
    deletedAt?: string;
    updatedAt?: string;
    entries: Array<{
      id: string;
      date: string;
      value: number;
      comment?: string;
      createdAt: string;
      deletedAt?: string;
    }>;
  }>;
  tags: Array<{
    id: string;
    entryId: string;
    trackerId: string;
    tagName: string;
    tagNameWithOriginalCasing?: string;
  }>;
}
