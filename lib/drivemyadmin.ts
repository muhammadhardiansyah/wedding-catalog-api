/**
 * DriveMyAdmin Client SDK (TypeScript)
 * Zero-dependency client for DriveMyAdmin Database & Storage API.
 */

export interface DriveMyAdminConfig {
  baseUrl?: string;
  apiKey?: string;
}

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  directUrl: string;
  thumbnailLink?: string;
  createdTime?: string;
}

export interface TableRecordResponse<T = Record<string, any>> {
  headers: string[];
  rows: T[];
  rawRows?: any[][];
}

export class DriveMyAdminClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config?: DriveMyAdminConfig) {
    this.baseUrl = (
      config?.baseUrl ||
      (typeof process !== "undefined" && process.env?.DRIVEMYADMIN_URL) ||
      "https://drivemyadmin.ardana629.my.id"
    ).replace(/\/+$/, "");

    this.apiKey =
      config?.apiKey ||
      (typeof process !== "undefined" && process.env?.DRIVEMYADMIN_API_KEY) ||
      "";
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.apiKey) {
      h["x-api-key"] = this.apiKey;
    }
    return h;
  }

  /**
   * Interact with a specific table's records.
   * @param tableId The ID of the table (spreadsheet ID)
   */
  table<T = Record<string, any>>(tableId: string) {
    return {
      /**
       * Fetch all rows from the table
       */
      select: async (): Promise<TableRecordResponse<T>> => {
        const res = await fetch(
          `${this.baseUrl}/api/records?tableId=${encodeURIComponent(tableId)}`,
          {
            method: "GET",
            headers: this.headers,
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to fetch table records: ${res.statusText}`);
        }
        return json.data;
      },

      /**
       * Insert a new record into the table
       */
      insert: async (data: Partial<T>): Promise<any> => {
        const res = await fetch(`${this.baseUrl}/api/records`, {
          method: "POST",
          headers: {
            ...this.headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableId, data }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to insert record: ${res.statusText}`);
        }
        return json.data;
      },

      /**
       * Update an existing record by row index (1-based sheet row index)
       */
      update: async (rowIndex: number, data: Partial<T>): Promise<{ success: boolean }> => {
        const res = await fetch(`${this.baseUrl}/api/records`, {
          method: "PUT",
          headers: {
            ...this.headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableId, rowIndex, data }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to update record: ${res.statusText}`);
        }
        return json;
      },

      /**
       * Delete a record by row index
       */
      delete: async (rowIndex: number): Promise<{ success: boolean }> => {
        const res = await fetch(
          `${this.baseUrl}/api/records?tableId=${encodeURIComponent(tableId)}&rowIndex=${rowIndex}`,
          {
            method: "DELETE",
            headers: this.headers,
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to delete record: ${res.statusText}`);
        }
        return json;
      },
    };
  }

  /**
   * Interact with object storage scoped to a table.
   * Files are stored under the folder for the table and returned with direct public streamable URLs.
   */
  storage(dbId: string, tableName: string) {
    return {
      /**
       * List all files in the table storage
       */
      list: async (): Promise<StorageFile[]> => {
        const res = await fetch(
          `${this.baseUrl}/api/storage?dbId=${encodeURIComponent(dbId)}&table=${encodeURIComponent(tableName)}`,
          {
            method: "GET",
            headers: this.headers,
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to list storage files: ${res.statusText}`);
        }
        return json.data;
      },

      /**
       * Upload a file (File, Blob, or Buffer) to table storage
       */
      upload: async (file: File | Blob, filename?: string): Promise<StorageFile> => {
        const formData = new FormData();
        formData.append("dbId", dbId);
        formData.append("table", tableName);
        if (filename && !(file instanceof File)) {
          formData.append("file", file, filename);
        } else {
          formData.append("file", file);
        }

        const res = await fetch(`${this.baseUrl}/api/storage`, {
          method: "POST",
          headers: this.headers,
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to upload file: ${res.statusText}`);
        }
        return json.data;
      },

      /**
       * Delete a file from storage by its fileId
       */
      delete: async (fileId: string): Promise<{ success: boolean }> => {
        const res = await fetch(
          `${this.baseUrl}/api/storage?fileId=${encodeURIComponent(fileId)}`,
          {
            method: "DELETE",
            headers: this.headers,
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to delete file: ${res.statusText}`);
        }
        return json;
      },
    };
  }

  /**
   * Database metadata and management
   */
  databases() {
    return {
      list: async (): Promise<Array<{ id: string; name: string }>> => {
        const res = await fetch(`${this.baseUrl}/api/databases`, {
          method: "GET",
          headers: this.headers,
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to list databases");
        }
        return json.data;
      },
    };
  }

  /**
   * Table metadata and management
   */
  tables(dbId: string) {
    return {
      list: async (): Promise<Array<{ id: string; name: string; columns: string[] }>> => {
        const res = await fetch(`${this.baseUrl}/api/tables?dbId=${encodeURIComponent(dbId)}`, {
          method: "GET",
          headers: this.headers,
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to list tables");
        }
        return json.data;
      },
    };
  }
}

/**
 * Singleton client instance initialized with environment variables
 */
export const db = new DriveMyAdminClient();
export default db;
