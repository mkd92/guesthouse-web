<!-- Mobile top bar (visible only on mobile) -->
<script>
  export let title = 'GuestHouse';
  import { userProfile } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let menuOpen = false;

  async function logout() {
    await supabase.auth.signOut();
  }
</script>

<header class="md:hidden sticky top-0 z-30 px-4 h-14 flex items-center justify-between"
  style="background: rgba(11,13,20,0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid var(--border);">
  <div class="flex items-center gap-2.5">
    <div class="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
      style="background: var(--accent-dim); border: 1px solid rgba(245,158,11,0.2);">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
    <span class="font-bold text-[15px] tracking-tight" style="color: var(--text-1);">{title}</span>
  </div>

  <div class="relative">
    <button
      on:click={() => menuOpen = !menuOpen}
      class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all"
      style="background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(245,158,11,0.2);"
    >
      {($userProfile?.name || 'U').charAt(0).toUpperCase()}
    </button>

    {#if menuOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="fixed inset-0 z-40" on:click={() => menuOpen = false}></div>
      <div class="absolute right-0 top-10 w-52 rounded-2xl z-50 overflow-hidden"
        style="background: var(--bg-elevated); border: 1px solid var(--border-md); box-shadow: 0 16px 40px rgba(0,0,0,0.4);">
        <div class="px-4 py-3" style="border-bottom: 1px solid var(--border);">
          <p class="text-[13px] font-semibold" style="color: var(--text-1);">{$userProfile?.name || 'User'}</p>
          <p class="text-[11px] capitalize font-medium mt-0.5" style="color: var(--text-3);">{$userProfile?.role || 'staff'}</p>
        </div>
        <a
          href="/staff"
          class="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors"
          style="color: var(--text-2);"
          on:click={() => menuOpen = false}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-3);">
            <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
          </svg>
          Staff Management
        </a>
        <button
          on:click={logout}
          class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors"
          style="color: #fb7185;"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign out
        </button>
      </div>
    {/if}
  </div>
</header>
