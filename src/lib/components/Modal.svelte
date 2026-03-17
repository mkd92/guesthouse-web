<script>
  export let title = '';
  export let open = false;
  export let size = 'md'; // sm, md, lg

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) open = false;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
    style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
    on:click={handleBackdrop}
  >
    <div
      class="w-full {sizeClasses[size]} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden"
      style="background: var(--bg-elevated); border: 1px solid var(--border-md); box-shadow: 0 32px 80px rgba(0,0,0,0.5);"
    >
      <!-- Drag handle (mobile) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="w-10 h-1 rounded-full" style="background: var(--border-md);"></div>
      </div>

      <div class="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style="border-bottom: 1px solid var(--border);">
        <h2 class="text-[15px] font-bold tracking-tight" style="color: var(--text-1);">{title}</h2>
        <button
          on:click={() => open = false}
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style="background: var(--bg-hover); color: var(--text-2);"
          onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-1)'; }}
          onmouseleave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-5 safe-bottom">
        <slot />
      </div>
    </div>
  </div>
{/if}
