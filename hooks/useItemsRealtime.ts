'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Item, ItemType, UpdateItemInput } from '@/types/item';
import { User as SupabaseUser } from '@supabase/supabase-js';

export function useItemsRealtime(userId?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const supabase = useMemo(() => createClient(), []);

  // Sort helper: prioritize sort_order if present, fallback to created_at desc
  const sortItemsList = useCallback((list: Item[]): Item[] => {
    return [...list].sort((a, b) => {
      const orderA = a.sort_order ?? a.metadata?.sort_order;
      const orderB = b.sort_order ?? b.metadata?.sort_order;

      if (orderA !== undefined && orderA !== null && orderB !== undefined && orderB !== null) {
        return orderA - orderB;
      }
      if (orderA !== undefined && orderA !== null) return -1;
      if (orderB !== undefined && orderB !== null) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  // Fetch items ONLY for the logged-in user
  const fetchItemsForUser = useCallback(
    async (user: SupabaseUser | null) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        setIsConnected(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching items for user:', error);
        } else if (data) {
          setItems(sortItemsList(data as Item[]));
        }
      } catch (err) {
        console.error('Unexpected error fetching items:', err);
      } finally {
        setLoading(false);
      }
    },
    [supabase, sortItemsList]
  );

  // Listen to Auth State Changes
  useEffect(() => {
    // 1. Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      fetchItemsForUser(user);
    });

    // 2. Subscribe to auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      fetchItemsForUser(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchItemsForUser]);

  // Setup Realtime Channel ONLY when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setIsConnected(false);
      return;
    }

    const currentUserId = currentUser.id;
    const channel = supabase
      .channel(`items_sync_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Item;
            setItems((prev) => {
              if (prev.some((item) => item.id === newItem.id)) {
                return prev.map((item) => (item.id === newItem.id ? newItem : item));
              }
              return sortItemsList([newItem, ...prev]);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Item;
            setItems((prev) =>
              sortItemsList(
                prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((item) => item.id !== oldId));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUser, sortItemsList]);

  // Add Item (Strictly requires login)
  const addItem = useCallback(
    async (itemData: {
      type: ItemType;
      title?: string | null;
      content: string;
      metadata?: any;
      remind_at?: string | null;
      expires_at?: string | null;
    }) => {
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      const tempId = 'temp-' + Date.now();
      const currentMinOrder = items.reduce(
        (min, it) => Math.min(min, it.sort_order ?? it.metadata?.sort_order ?? 0),
        0
      );
      const newOrder = currentMinOrder - 1;

      const optimisticItem: Item = {
        id: tempId,
        user_id: currentUser.id,
        type: itemData.type,
        title: itemData.title || null,
        content: itemData.content,
        metadata: { ...(itemData.metadata || {}), sort_order: newOrder },
        is_completed: false,
        remind_at: itemData.remind_at || null,
        expires_at: itemData.expires_at || null,
        is_archived: false,
        sort_order: newOrder,
        created_at: new Date().toISOString(),
      };

      setItems((prev) => [optimisticItem, ...prev]);

      try {
        const insertPayload: any = {
          user_id: currentUser.id,
          type: itemData.type,
          title: itemData.title || null,
          content: itemData.content,
          metadata: { ...(itemData.metadata || {}), sort_order: newOrder },
          is_completed: false,
          remind_at: itemData.remind_at || null,
          expires_at: itemData.expires_at || null,
          is_archived: false,
        };

        const { data, error } = await supabase
          .from('items')
          .insert([insertPayload])
          .select()
          .single();

        if (error) {
          console.error('Failed to save item:', error);
          setItems((prev) => prev.filter((i) => i.id !== tempId));
          throw error;
        }

        if (data) {
          setItems((prev) =>
            prev.map((i) => (i.id === tempId ? (data as Item) : i))
          );
          return data as Item;
        }
      } catch (err) {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        throw err;
      }
    },
    [supabase, items, currentUser]
  );

  // Update Item
  const updateItem = useCallback(
    async (id: string, updates: UpdateItemInput) => {
      if (!currentUser) return;

      const backup = items.find((it) => it.id === id);
      if (!backup) return;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      try {
        const { error } = await supabase
          .from('items')
          .update(updates)
          .eq('id', id)
          .eq('user_id', currentUser.id);

        if (error) {
          console.error('Failed to update item:', error);
          setItems((prev) =>
            prev.map((item) => (item.id === id ? backup : item))
          );
        }
      } catch (err) {
        console.error('Update error:', err);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? backup : item))
        );
      }
    },
    [items, supabase, currentUser]
  );

  // Reorder Items
  const reorderItems = useCallback(
    async (reorderedList: Item[]) => {
      if (!currentUser) return;

      const updatedList = reorderedList.map((item, index) => ({
        ...item,
        sort_order: index,
        metadata: {
          ...(item.metadata || {}),
          sort_order: index,
        },
      }));

      setItems(updatedList);

      try {
        const updates = updatedList.map((item, index) =>
          supabase
            .from('items')
            .update({
              metadata: {
                ...(item.metadata || {}),
                sort_order: index,
              },
            })
            .eq('id', item.id)
            .eq('user_id', currentUser.id)
        );

        await Promise.allSettled(updates);
      } catch (err) {
        console.warn('Failed to sync reordered items:', err);
      }
    },
    [supabase, currentUser]
  );

  // Toggle complete
  const toggleComplete = useCallback(
    async (id: string, currentStatus: boolean) => {
      if (!currentUser) return;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_completed: !currentStatus } : item
        )
      );

      const { error } = await supabase
        .from('items')
        .update({ is_completed: !currentStatus })
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to toggle completion:', error);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_completed: currentStatus } : item
          )
        );
      }
    },
    [supabase, currentUser]
  );

  // Toggle archive
  const toggleArchive = useCallback(
    async (id: string, currentStatus: boolean) => {
      if (!currentUser) return;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_archived: !currentStatus } : item
        )
      );

      const { error } = await supabase
        .from('items')
        .update({ is_archived: !currentStatus })
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to toggle archive:', error);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_archived: currentStatus } : item
          )
        );
      }
    },
    [supabase, currentUser]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id: string, storagePath?: string) => {
      if (!currentUser) return;

      const backup = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((item) => item.id !== id));

      if (storagePath) {
        try {
          await supabase.storage.from('files').remove([storagePath]);
        } catch (storageErr) {
          console.warn('Storage cleanup warning:', storageErr);
        }
      }

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to delete item:', error);
        if (backup) {
          setItems((prev) => [backup, ...prev]);
        }
      }
    },
    [items, supabase, currentUser]
  );

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setItems([]);
  }, [supabase]);

  return {
    items,
    currentUser,
    loading,
    isConnected,
    fetchItems: () => fetchItemsForUser(currentUser),
    addItem,
    updateItem,
    reorderItems,
    toggleComplete,
    toggleArchive,
    deleteItem,
    signOut,
  };
}
