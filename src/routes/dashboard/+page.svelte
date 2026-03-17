<script>
  import { onMount } from 'svelte';
  import { getDashboardStats, getTransactions, getBookings, getProperties } from '$lib/stores/data';
  import WhatsAppButton from '$lib/components/WhatsAppButton.svelte';
  import { rentReminderMessage } from '$lib/utils/whatsapp';
  import { format } from 'date-fns';

  let stats = null;
  let recentTransactions = [];
  let activeBookings = [];
  let properties = [];
  let loading = true;
  let selectedPropertyId = '';

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, 'dd MMM');
  }

  async function loadData() {
    loading = true;
    const propFilter = selectedPropertyId || null;
    const txnFilters = { status: 'pending' };
    if (propFilter) txnFilters.propertyId = propFilter;
    try {
      [stats, recentTransactions, activeBookings] = await Promise.all([
        getDashboardStats(propFilter),
        getTransactions(txnFilters),
        getBookings('active')
      ]);
      recentTransactions = recentTransactions.slice(0, 6);
      activeBookings = propFilter
        ? activeBookings.filter(b => b.propertyId === propFilter).slice(0, 5)
        : activeBookings.slice(0, 5);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    properties = await getProperties();
    await loadData();
  });

  function getWhatsAppMsg(txn) {
    return rentReminderMessage({
      customerName: txn.customerName || 'Tenant',
      amount: txn.amount,
      period: txn.period,
      propertyName: txn.propertyName || 'the property'
    });
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

  <!-- Header -->
  <div class="hidden md:flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight" style="color: var(--text-1);">Dashboard</h1>
      <p class="text-sm mt-0.5" style="color: var(--text-3);">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
    </div>
    {#if properties.length > 0}
      <select class="input w-auto" bind:value={selectedPropertyId} on:change={loadData}>
        <option value="">All Properties</option>
        {#each properties as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- Mobile property selector -->
  {#if properties.length > 0}
    <select class="input md:hidden" bind:value={selectedPropertyId} on:change={loadData}>
      <option value="">All Properties</option>
      {#each properties as p}
        <option value={p.id}>{p.name}</option>
      {/each}
    </select>
  {/if}

  {#if loading}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each Array(4) as _}
        <div class="rounded-2xl h-24 animate-pulse" style="background: var(--bg-surface);"></div>
      {/each}
    </div>

  {:else if stats}

    <!-- PG Beds stats -->
    {#if stats.totalBeds > 0 || !selectedPropertyId}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.15);">🛏️</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">PG Beds</p>
            <p class="text-xl font-bold" style="color: var(--text-1);">{stats.totalBeds}</p>
          </div>
        </div>
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.15);">✅</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Available</p>
            <p class="text-xl font-bold" style="color: #34d399;">{stats.availableBeds}</p>
          </div>
        </div>
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(192,132,252,0.1); border: 1px solid rgba(192,132,252,0.15);">👥</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Occupied</p>
            <p class="text-xl font-bold" style="color: #c084fc;">{stats.occupiedBeds}</p>
          </div>
        </div>
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid rgba(251,113,133,0.15);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(251,113,133,0.1); border: 1px solid rgba(251,113,133,0.15);">💰</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Pending Rent</p>
            <p class="text-lg font-bold mono" style="color: #fb7185;">{formatCurrency(stats.totalPendingRent)}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Units/Leases stats -->
    {#if stats.totalUnits > 0}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(129,140,248,0.1); border: 1px solid rgba(129,140,248,0.15);">🏗️</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Total Units</p>
            <p class="text-xl font-bold" style="color: var(--text-1);">{stats.totalUnits}</p>
          </div>
        </div>
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.15);">📋</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Active Leases</p>
            <p class="text-xl font-bold" style="color: #34d399;">{stats.activeLeases}</p>
          </div>
        </div>
        <div class="rounded-2xl p-4 flex items-center gap-3" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style="background: rgba(255,255,255,0.05); border: 1px solid var(--border);">🏠</div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Units Free</p>
            <p class="text-xl font-bold" style="color: var(--text-1);">{stats.availableUnits}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Occupancy bar -->
    {#if stats.totalBeds > 0}
      {@const pct = Math.round((stats.occupiedBeds / stats.totalBeds) * 100)}
      <div class="rounded-2xl p-4" style="background: var(--bg-surface); border: 1px solid var(--border);">
        <div class="flex justify-between items-center mb-2.5">
          <span class="text-sm font-semibold" style="color: var(--text-2);">PG Occupancy</span>
          <span class="text-sm font-bold mono" style="color: var(--accent);">{pct}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
          <div class="h-2 rounded-full transition-all duration-500"
            style="width: {pct}%; background: var(--accent); box-shadow: 0 0 8px var(--accent-glow);"></div>
        </div>
        <div class="flex justify-between text-xs mt-2" style="color: var(--text-3);">
          <span>{stats.occupiedBeds} occupied</span>
          <span>{stats.availableBeds} free</span>
          {#if stats.maintenanceBeds > 0}<span>{stats.maintenanceBeds} maintenance</span>{/if}
        </div>
      </div>
    {/if}

    <!-- Pending Payments -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold" style="color: var(--text-1);">Pending Payments</h2>
        <a href="/transactions" class="text-sm font-medium transition-colors" style="color: var(--accent);">View all →</a>
      </div>
      {#if recentTransactions.length === 0}
        <div class="rounded-2xl p-6 text-center" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <p class="text-2xl mb-1">🎉</p>
          <p class="text-sm" style="color: var(--text-3);">No pending payments!</p>
        </div>
      {:else}
        <div class="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style="scrollbar-width:none;">
          {#each recentTransactions as txn}
            <div class="rounded-2xl p-4 flex-shrink-0 w-48 snap-start transition-all"
              style="background: var(--bg-surface); border: 1px solid rgba(251,113,133,0.15);">
              <p class="font-semibold text-sm truncate" style="color: var(--text-1);">{txn.customerName || 'Unknown'}</p>
              <p class="text-xs mt-0.5 truncate" style="color: var(--text-3);">{txn.period || '—'}</p>
              <p class="text-lg font-bold mono mt-2" style="color: #fb7185;">{formatCurrency(txn.amount)}</p>
              <p class="text-xs" style="color: var(--text-3);">Due {formatDate(txn.dueDate)}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Active Guests -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold" style="color: var(--text-1);">Active Guests</h2>
        <a href="/customers" class="text-sm font-medium transition-colors" style="color: var(--accent);">View all →</a>
      </div>
      {#if activeBookings.length === 0}
        <div class="rounded-2xl p-6 text-center" style="background: var(--bg-surface); border: 1px solid var(--border);">
          <p class="text-sm" style="color: var(--text-3);">No active bookings</p>
        </div>
      {:else}
        <div class="rounded-2xl overflow-hidden" style="background: var(--bg-surface); border: 1px solid var(--border);">
          {#each activeBookings as booking, i}
            <div class="flex items-center justify-between px-4 py-3 transition-colors"
              style={i < activeBookings.length - 1 ? 'border-bottom: 1px solid var(--border);' : ''}>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style="background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(245,158,11,0.2);">
                  {(booking.customerName || 'G').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p class="text-sm font-medium" style="color: var(--text-1);">{booking.customerName || 'Guest'}</p>
                  <p class="text-xs" style="color: var(--text-3);">Bed {booking.bedNumber || booking.bedId} · Since {formatDate(booking.checkIn)}</p>
                </div>
              </div>
              <p class="text-sm font-semibold mono flex-shrink-0 ml-2" style="color: var(--text-2);">
                {formatCurrency(booking.rentPerMonth)}<span class="text-xs font-normal" style="color: var(--text-3);">/mo</span>
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {/if}
</div>
