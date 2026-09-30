import 'dotenv/config';

export class DriveMyAdminClient {
  constructor(config = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.DRIVEMYADMIN_URL ||
      'https://drivemyadmin.ardana629.my.id'
    ).replace(/\/+$/, '');

    this.apiKey =
      config.apiKey ||
      process.env.DRIVEMYADMIN_API_KEY ||
      '';

    this.dbId =
      config.dbId ||
      process.env.DRIVEMYADMIN_DB_ID ||
      '';

    this._tableCache = null;
  }

  get headers() {
    const h = {};
    if (this.apiKey) {
      h['x-api-key'] = this.apiKey;
    }
    return h;
  }

  async fetchTables(force = false) {
    if (this._tableCache && !force) return this._tableCache;
    try {
      const res = await fetch(`${this.baseUrl}/api/tables?dbId=${encodeURIComponent(this.dbId)}`, {
        headers: this.headers
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this._tableCache = json.data;
        return json.data;
      }
    } catch (e) {
      console.warn('[DriveMyAdmin] fetchTables failed:', e.message);
    }
    return [];
  }

  async getTableId(tableName) {
    const tables = await this.fetchTables();
    const found = tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
    return found ? found.id : null;
  }

  table(tableId) {
    return {
      select: async () => {
        const res = await fetch(
          `${this.baseUrl}/api/records?tableId=${encodeURIComponent(tableId)}`,
          {
            method: 'GET',
            headers: this.headers
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to fetch table records: ${res.statusText}`);
        }
        return json.data;
      },

      insert: async (data) => {
        const res = await fetch(`${this.baseUrl}/api/records`, {
          method: 'POST',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tableId, data })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to insert record: ${res.statusText}`);
        }
        return json.data;
      },

      update: async (rowIndex, data) => {
        const res = await fetch(`${this.baseUrl}/api/records`, {
          method: 'PUT',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tableId, rowIndex, data })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to update record: ${res.statusText}`);
        }
        return json;
      },

      delete: async (rowIndex) => {
        const res = await fetch(
          `${this.baseUrl}/api/records?tableId=${encodeURIComponent(tableId)}&rowIndex=${rowIndex}`,
          {
            method: 'DELETE',
            headers: this.headers
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to delete record: ${res.statusText}`);
        }
        return json;
      }
    };
  }

  storage(tableName) {
    return {
      upload: async (buffer, filename, mimeType = 'image/jpeg') => {
        const formData = new FormData();
        formData.append('dbId', this.dbId);
        formData.append('table', tableName);
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('file', blob, filename);

        const res = await fetch(`${this.baseUrl}/api/storage`, {
          method: 'POST',
          headers: this.headers,
          body: formData
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to upload file: ${res.statusText}`);
        }
        return json.data;
      }
    };
  }
}

export const dbClient = new DriveMyAdminClient();
export default dbClient;
