import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase';

export const user = writable(null);
export const userProfile = writable(null);
export const authLoading = writable(true);

async function loadProfile(uid) {
  const { data, error } = await supabase.from('users').select('id,name,email,role').eq('id', uid).maybeSingle();
  console.log('[loadProfile] uid:', uid, 'data:', data, 'error:', error);
  if (data) {
    userProfile.set({ id: data.id, name: data.name, email: data.email, role: data.role });
  }
}

export async function initAuth() {
  try {
    // getUser() validates the JWT server-side (stronger than getSession)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      user.set({ ...authUser, uid: authUser.id });
      await loadProfile(authUser.id);
    }
  } catch (e) {
    console.error('[initAuth] exception:', e);
  } finally {
    authLoading.set(false);
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
if (session?.user) {
      user.set({ ...session.user, uid: session.user.id });
      await loadProfile(session.user.id).catch(console.error);
    } else if (event === 'SIGNED_OUT') {
      user.set(null);
      userProfile.set(null);
    }
  });
}

export const isAdmin = derived(userProfile, ($p) => $p?.role === 'admin');
export const isLoggedIn = derived(user, ($u) => !!$u);
