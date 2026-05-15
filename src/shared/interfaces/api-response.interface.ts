export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | null;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: ResponseMeta;
  timestamp: string;
  path: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: any;
}
