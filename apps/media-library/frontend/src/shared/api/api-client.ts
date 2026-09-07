// In scope: backend の route 定義からレスポンス型を導出した client の生成
// Out of scope: 取得したデータの整形、画面の状態管理、エラーの見せ方
import type { ApiType } from "@backend/app.js";
import { hc } from "hono/client";

/**
 * backend の API client。
 * 型は backend の route 定義から導出するため、レスポンスの形を手で書き写さない。
 */
export const apiClient = hc<ApiType>("/api");
