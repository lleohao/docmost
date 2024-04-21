import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  createPage,
  deletePage,
  getPageById,
  getSidebarPages,
  getRecentChanges,
  updatePage,
  movePage,
  getPageBreadcrumbs,
} from "@/features/page/services/page-service";
import {
  IMovePage,
  IPage,
  SidebarPagesParams,
} from "@/features/page/types/page.types";
import { notifications } from "@mantine/notifications";
import { IPagination } from "@/lib/types.ts";
import { queryClient } from "@/main.tsx";
import { buildTree } from "@/features/page/tree/utils";

const RECENT_CHANGES_KEY = ["recentChanges"];

export function usePageQuery(pageId: string): UseQueryResult<IPage, Error> {
  return useQuery({
    queryKey: ["pages", pageId],
    queryFn: () => getPageById(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentChangesQuery(): UseQueryResult<IPage[], Error> {
  return useQuery({
    queryKey: RECENT_CHANGES_KEY,
    queryFn: () => getRecentChanges(),
    refetchOnMount: true,
  });
}

export function useCreatePageMutation() {
  return useMutation<IPage, Error, Partial<IPage>>({
    mutationFn: (data) => createPage(data),
    onSuccess: (data) => {},
    onError: (error) => {
      notifications.show({ message: "Failed to create page", color: "red" });
    },
  });
}

export function useUpdatePageMutation() {
  const queryClient = useQueryClient();
  return useMutation<IPage, Error, Partial<IPage>>({
    mutationFn: (data) => updatePage(data),
    onSuccess: (data) => {
      // update page in cache
      queryClient.setQueryData(["pages", data.id], data);
    },
  });
}

export function useDeletePageMutation() {
  return useMutation({
    mutationFn: (pageId: string) => deletePage(pageId),
    onSuccess: () => {
      notifications.show({ message: "Page deleted successfully" });
    },
    onError: (error) => {
      notifications.show({ message: "Failed to delete page", color: "red" });
    },
  });
}

export function useMovePageMutation() {
  return useMutation<void, Error, IMovePage>({
    mutationFn: (data) => movePage(data),
  });
}

export function useGetSidebarPagesQuery(
  data: SidebarPagesParams,
): UseQueryResult<IPagination<IPage>, Error> {
  return useQuery({
    queryKey: ["sidebar-pages", data],
    queryFn: () => getSidebarPages(data),
  });
}

export function useGetRootSidebarPagesQuery(data: SidebarPagesParams) {
  return useInfiniteQuery({
    queryKey: ["root-sidebar-pages", data.spaceId],
    queryFn: async ({ pageParam }) => {
      return getSidebarPages({ spaceId: data.spaceId, page: pageParam });
    },
    initialPageParam: 1,
    getPreviousPageParam: (firstPage) =>
      firstPage.meta.hasPrevPage ? firstPage.meta.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });
}

export function usePageBreadcrumbsQuery(
  pageId: string,
): UseQueryResult<Partial<IPage[]>, Error> {
  return useQuery({
    queryKey: ["breadcrumbs", pageId],
    queryFn: () => getPageBreadcrumbs(pageId),
    enabled: !!pageId,
  });
}

export async function fetchAncestorChildren(params: SidebarPagesParams) {
  // not using a hook here, so we can call it inside a useEffect hook
  const response = await queryClient.fetchQuery({
    queryKey: ["sidebar-pages", params],
    queryFn: () => getSidebarPages(params),
    staleTime: 30 * 60 * 1000,
  });
  return buildTree(response.items);
}
