export type ItemType = 'text' | 'link' | 'todo' | 'file';
export type CategoryFilterType = 'all' | ItemType;

export interface OgMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  url?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  downloadUrl?: string;
}

export interface ItemMetadata {
  og?: OgMetadata;
  file?: FileMetadata;
  sort_order?: number;
  [key: string]: any;
}

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string | null;
  content: string | null;
  metadata: ItemMetadata;
  is_completed: boolean;
  remind_at: string | null;
  expires_at: string | null;
  is_archived: boolean;
  sort_order?: number | null;
  created_at: string;
}

export type CreateItemInput = {
  type: ItemType;
  title?: string | null;
  content: string;
  metadata?: ItemMetadata;
  remind_at?: string | null;
  expires_at?: string | null;
  sort_order?: number | null;
};

export type UpdateItemInput = {
  title?: string | null;
  content?: string | null;
  metadata?: ItemMetadata;
  is_completed?: boolean;
  remind_at?: string | null;
  expires_at?: string | null;
  is_archived?: boolean;
  sort_order?: number | null;
};
