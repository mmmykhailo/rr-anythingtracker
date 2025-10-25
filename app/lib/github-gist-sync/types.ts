export interface GistFile {
  content: string;
}

export interface GistFiles {
  [filename: string]: GistFile;
}

export interface GistResponse {
  id: string;
  files: {
    [filename: string]: {
      filename: string;
      type: string;
      language: string;
      raw_url: string;
      size: number;
      content: string;
    };
  };
  description: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadOptions {
  filename?: string;
  description?: string;
  token?: string;
  gistId?: string;
}

export interface DownloadOptions {
  filename?: string;
  token?: string;
  gistId?: string;
}
