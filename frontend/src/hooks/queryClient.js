// src/hooks/queryClient.js
/**
 * Cấu hình QueryClient dùng chung cho toàn app.
 *
 * Chiến lược cache:
 *   staleTime  — bao lâu data được coi là "fresh", KHÔNG refetch dù re-mount hay refocus
 *   gcTime     — bao lâu giữ data trong memory sau khi không còn observer nào (formerly cacheTime)
 *   retry      — số lần retry khi request lỗi
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút — đủ để navigate qua lại không refetch
      gcTime: 30 * 60 * 1000, // 30 phút — giữ trong memory khi không xem
      retry: 1, // thử lại 1 lần nếu lỗi network
      refetchOnWindowFocus: false, // tắt refetch khi alt-tab về — quá aggressive
    },
    mutations: {
      retry: 0, // mutation (POST/PUT/DELETE) không retry
    },
  },
});
